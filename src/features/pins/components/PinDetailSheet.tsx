"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMUNITY_COLORS } from "@/constants/community-colors";
import { CommentComposer } from "@/features/comments/components/CommentComposer";
import { CommentList } from "@/features/comments/components/CommentList";
import { CommentSortTabs } from "@/features/comments/components/CommentSortTabs";
import { CommunityCommentFilter } from "@/features/communities/components/CommunityCommentFilter";
import { useMyCommunities } from "@/features/communities/hooks/use-communities";
import { usePinComments } from "@/features/comments/hooks/usePinComments";
import { DEFAULT_COMMENT_SORT } from "@/features/comments/lib/sort";
import { useSession } from "@/features/auth/hooks/useSession";
import { ApiError } from "@/lib/api/client";
import { formatTimeAgo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CommentSort, PinSummary } from "@/types/api";
import { Lock, MapPinOff, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePin } from "../hooks/usePin";
import { PIN_ACTIVITY, pinActivity } from "../lib/activity";
import { PinActions } from "./PinActions";

interface PinDetailSheetProps {
  pinId: string | null;
  onClose: () => void;
  onRequireSignIn: () => void;
  /** The map's community filter: comments open filtered to it. */
  communityId?: string | null;
}

export function PinDetailSheet({
  pinId,
  onClose,
  onRequireSignIn,
  communityId = null,
}: PinDetailSheetProps) {
  // Keep rendering the last pin while the sheet animates out.
  const [shownId, setShownId] = useState(pinId);
  if (pinId && pinId !== shownId) setShownId(pinId);

  return (
    <ResponsiveDialog open={!!pinId} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent
        desktopSide="right"
        className="flex flex-col overflow-hidden"
        mobileClassName="max-sm:h-[88dvh] max-sm:max-h-[88dvh]"
      >
        {/* keyed so sort/scroll state resets when switching pins */}
        {shownId ? (
          <PinDetail
            key={shownId}
            pinId={shownId}
            onClose={onClose}
            onRequireSignIn={onRequireSignIn}
            initialCommunityId={communityId}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function PinDetail({
  pinId,
  onClose,
  onRequireSignIn,
  initialCommunityId,
}: {
  pinId: string;
  onClose: () => void;
  onRequireSignIn: () => void;
  initialCommunityId: string | null;
}) {
  const t = useTranslations("pins.detail");
  const tFilter = useTranslations("communities.commentFilter");
  const { user } = useSession();
  const [sort, setSort] = useState<CommentSort>(DEFAULT_COMMENT_SORT);
  const communities = useMyCommunities();
  const [pickedCommunity, setCommunity] = useState(initialCommunityId);
  const pinQuery = usePin(pinId);
  const pin = pinQuery.data;
  // Only filter by a community the viewer is (still) in, and never on a
  // community-only pin: everyone there is already a member.
  const community =
    user && !pin?.community
      ? communities.data?.find((c) => c.id === pickedCommunity) ?? null
      : null;
  const comments = usePinComments(pinId, sort, community?.id ?? null);

  const notFound =
    (pinQuery.error instanceof ApiError && pinQuery.error.status === 404) ||
    // With a community filter a 404 means "not a member (any more)".
    (!community && comments.error instanceof ApiError && comments.error.status === 404);
  const lostCommunity =
    !!community && comments.error instanceof ApiError && comments.error.status === 404;
  useEffect(() => {
    if (lostCommunity) setCommunity(null);
  }, [lostCommunity]);

  if (notFound) {
    return (
      <ResponsiveDialogPanel title={t("notFoundTitle")} headerClassName="sr-only">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <MapPinOff className="size-6 text-muted-foreground" />
          </span>
          <p className="text-base font-semibold">{t("notFoundHeading")}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("notFoundDescription")}
          </p>
          <Button variant="outline" className="mt-2 h-10 rounded-xl" onClick={onClose}>
            {t("backToMap")}
          </Button>
        </div>
      </ResponsiveDialogPanel>
    );
  }

  // The header always counts everyone; the filter only narrows the list.
  const count =
    comments.data && !community ? comments.total : pin?.comments_count ?? 0;
  const listCount = comments.data ? comments.total : count;
  const showFilter = !!communities.data?.length && count > 0 && !!pin && !pin.community;

  return (
    <ResponsiveDialogPanel title={pin?.name ?? t("fallbackTitle")} headerClassName="sr-only">
      <div className="flex min-h-0 flex-1 flex-col">
        <PinHeader pin={pin} count={count} />

        {showFilter || listCount > 1 ? (
          <div className="flex flex-col gap-2.5 px-5 pb-3 sm:px-6">
            {showFilter ? (
              <CommunityCommentFilter
                communities={communities.data!}
                value={community?.id ?? null}
                onChange={setCommunity}
              />
            ) : null}
            {listCount > 1 ? <CommentSortTabs value={sort} onChange={setSort} /> : null}
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1 border-t border-border/50 px-5 sm:px-6 [&_[data-radix-scroll-area-viewport]]:overscroll-contain">
          <CommentList
            pinId={pinId}
            pin={pin}
            query={comments}
            currentUserId={user?.id ?? null}
            onRequireSignIn={onRequireSignIn}
            onPinDeleted={onClose}
            filteredEmpty={
              community
                ? {
                    title: tFilter("emptyTitle", { name: community.name }),
                    description: tFilter("emptyDescription"),
                  }
                : null
            }
          />
        </ScrollArea>

        <div className="border-t border-border/50 bg-background px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
          <CommentComposer
            pinId={pinId}
            pin={pin}
            currentUserId={user?.id ?? null}
            alreadyCommented={!!comments.myCommentId}
          />
        </div>
      </div>
    </ResponsiveDialogPanel>
  );
}

function PinHeader({ pin, count }: { pin: PinSummary | undefined; count: number }) {
  const t = useTranslations("pins");
  const locale = useLocale();
  const activity = pinActivity(count);
  // Members-only pins wear their community's color, like on the map.
  const color = pin?.community ? COMMUNITY_COLORS[pin.community.color] : PIN_ACTIVITY[activity].color;
  return (
    <div className="px-5 pb-4 pt-1 sm:px-6 sm:pt-5">
      <div className="flex items-start gap-3 pr-10">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: color }}
        >
          <PinIcon className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {pin ? (
            <h2 className="text-lg font-bold leading-snug tracking-tight text-balance [overflow-wrap:anywhere]">
              {pin.name}
            </h2>
          ) : (
            <Skeleton className="mt-1 h-5 w-44" />
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {activity !== "new" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
                  activity === "hot"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                )}
              >
                {t(`activity.${activity}`)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageCircle className="size-3.5" aria-hidden />
              {t("detail.commentCount", { count })}
            </span>
            {pin?.community ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted px-2 py-px font-medium text-foreground/80">
                <Lock
                  className="size-3 shrink-0"
                  style={{ color: COMMUNITY_COLORS[pin.community.color] }}
                  aria-hidden
                />
                <span className="truncate">
                  {t("detail.membersOnly", { name: pin.community.name })}
                </span>
              </span>
            ) : null}
          </div>
          {pin ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {t.rich("detail.byline", {
                name: pin.user.display_name ?? t("deletedUser"),
                time: formatTimeAgo(pin.created_at, locale),
                b: (chunks) => <span className="font-medium text-foreground/80">{chunks}</span>,
              })}
            </p>
          ) : (
            <Skeleton className="mt-1.5 h-3 w-32" />
          )}
        </div>
      </div>
      <div className="mt-4 min-h-9">{pin ? <PinActions pin={pin} /> : <PinActionsSkeleton />}</div>
    </div>
  );
}

function PinActionsSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-9 w-28 rounded-xl" />
      <Skeleton className="h-9 w-20 rounded-xl" />
    </div>
  );
}
