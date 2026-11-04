"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { useMapUiStore } from "@/features/map/store/ui-store";
import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { ListMessage, UserListSkeleton } from "@/features/users/components/UserRow";
import { formatTimeAgo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types/api";
import { AlertCircle, Bell, Heart, MessageCircle, RotateCcw, UserPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMarkNotificationsRead, useNotifications } from "../hooks/use-notifications";

/** Max ids per POST /api/notifications/read. */
const MARK_READ_BATCH = 100;

const TYPE_ICON = {
  pin_commented: { icon: MessageCircle, className: "bg-primary text-primary-foreground" },
  comment_liked: { icon: Heart, className: "bg-rose-500 text-white" },
  followed: { icon: UserPlus, className: "bg-emerald-600 text-white" },
} as const;

function Actor({ item }: { item: NotificationItem }) {
  const name = item.actor.display_name || "Someone";
  const others = item.count - 1;
  return (
    <>
      <span className="font-semibold text-foreground">{name}</span>
      {others > 0 ? ` and ${others} ${others === 1 ? "other" : "others"}` : null}
    </>
  );
}

function Message({ item }: { item: NotificationItem }) {
  const pinName = item.pin ? <span className="font-medium text-foreground">{item.pin.name}</span> : "a pin";
  switch (item.type) {
    case "pin_commented":
      return item.pin?.is_mine ? (
        <>
          <Actor item={item} /> shared {item.count > 1 ? "opinions" : "an opinion"} on your pin {pinName}
        </>
      ) : (
        <>
          <Actor item={item} /> also shared {item.count > 1 ? "opinions" : "an opinion"} on {pinName}
        </>
      );
    case "comment_liked":
      return (
        <>
          <Actor item={item} /> liked your opinion on {pinName}
        </>
      );
    case "followed":
      return (
        <>
          <Actor item={item} /> started following you
        </>
      );
  }
}

function NotificationRow({ item, onOpen }: { item: NotificationItem; onOpen: () => void }) {
  const { icon: Icon, className: iconClass } = TYPE_ICON[item.type];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50",
          !item.read && "bg-primary/[0.06]"
        )}
      >
        <span className="relative shrink-0">
          <Avatar
            src={item.actor.avatar_url}
            alt=""
            size="md"
            fallbackText={item.actor.display_name || "?"}
          />
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full ring-2 ring-background [&_svg]:size-3",
              iconClass
            )}
          >
            <Icon />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-snug text-muted-foreground">
            <Message item={item} />
          </span>
          {item.comment && item.type !== "followed" ? (
            <span className="line-clamp-2 text-sm leading-snug text-foreground/80">
              “{item.comment.text}”
            </span>
          ) : null}
          <time dateTime={item.updated_at} className="text-xs text-muted-foreground/80">
            {formatTimeAgo(item.updated_at)}
          </time>
        </span>
        {!item.read ? (
          <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

/** Inbox panel: right-side sheet on desktop, bottom sheet on phones. */
export function NotificationInbox({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useNotifications(open);
  const items = query.items;
  const markRead = useMarkNotificationsRead();
  const marked = useRef(new Set<string>());
  const router = useRouter();
  const pathname = usePathname();
  const focusPin = useMapUiStore((s) => s.focusPin);

  // Everything the user has seen in the open list counts as read.
  const { mutateAsync } = markRead;
  useEffect(() => {
    if (!open) return;
    const unseen = items.filter((n) => !n.read && !marked.current.has(n.id));
    if (unseen.length === 0) return;
    const seenUntil = items.reduce((max, n) => (n.updated_at > max ? n.updated_at : max), "");
    for (let i = 0; i < unseen.length; i += MARK_READ_BATCH) {
      const ids = unseen.slice(i, i + MARK_READ_BATCH).map((n) => n.id);
      ids.forEach((id) => marked.current.add(id));
      // Forget them on failure so the next list update retries.
      mutateAsync({ ids, seenUntil }).catch(() => ids.forEach((id) => marked.current.delete(id)));
    }
  }, [open, items, mutateAsync]);

  const openItem = (item: NotificationItem) => {
    onOpenChange(false);
    if (item.type === "followed" || !item.pin) {
      router.push(`/u/${encodeURIComponent(item.actor.id)}`);
    } else if (pathname === "/") {
      focusPin(item.pin);
    } else {
      const { id, lat, lng } = item.pin;
      router.push(`/?pin=${encodeURIComponent(id)}&lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        desktopSide="right"
        mobileClassName="max-h-[85dvh] overflow-hidden"
        className="flex flex-col"
      >
        <ResponsiveDialogPanel
          title="Notifications"
          description="Opinions on your pins, likes and new followers."
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:max-h-[65dvh] sm:px-4">
            {query.isLoading ? (
              <UserListSkeleton />
            ) : query.error && items.length === 0 ? (
              <ListMessage
                tone="error"
                icon={<AlertCircle aria-hidden />}
                title="Couldn't load notifications"
                description={query.error.message}
                action={
                  <Button variant="outline" className="h-10 rounded-xl" onClick={() => void query.refetch()}>
                    <RotateCcw aria-hidden />
                    Try again
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <ListMessage
                icon={<Bell aria-hidden />}
                title="Nothing yet"
                description="When someone answers your pins, likes your opinions or follows you, it shows up here."
              />
            ) : (
              <>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={() => openItem(item)} />
                  ))}
                </ul>
                <LoadMore {...query} className="mt-1" />
              </>
            )}
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
