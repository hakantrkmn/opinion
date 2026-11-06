"use client";

import { COMMUNITY_COLORS } from "@/constants/community-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/hooks/useSession";
import { ReportDialog } from "@/features/moderation/components/ReportDialog";
import { ActionMenu, type ActionMenuItem } from "@/features/profile/components/action-menu";
import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { ListMessage, UserListSkeleton, UserRow } from "@/features/users/components/UserRow";
import { ApiError } from "@/lib/api/client";
import { formatTimeAgo } from "@/lib/formatters";
import type { CommunityResponse } from "@/types/api";
import {
  AlertCircle,
  ArrowLeft,
  Flag,
  LogOut,
  Map as MapIcon,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCommunity,
  useCommunityMembers,
  useDeleteCommunity,
  useRemoveMember,
  useResetInvite,
  useUpdateCommunity,
} from "../hooks/use-communities";
import { communityErrorMessage } from "../lib/errors";
import { communityMapHref } from "../lib/links";
import { CommunityFormDialog } from "./CommunityFormDialog";
import { InviteLinkCard } from "./InviteLinkCard";

const card = "rounded-3xl border border-border/60 bg-card p-5 shadow-xs sm:p-6";

type Confirm =
  | { kind: "remove"; userId: string; name: string }
  | { kind: "leave" }
  | { kind: "delete" }
  | { kind: "reset" };

type Community = CommunityResponse["community"];

/** /communities/:id — members only. */
export function CommunityDetailClient({ id }: { id: string }) {
  const t = useTranslations("communities.detail");
  const query = useCommunity(id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
      <Link
        href="/communities"
        className="-mb-2 inline-flex w-fit items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>

      {query.data ? (
        <CommunityBody community={query.data} />
      ) : query.isPending ? (
        <DetailSkeleton />
      ) : query.error instanceof ApiError && query.error.status === 404 ? (
        <ListMessage
          icon={<UsersRound aria-hidden />}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link href="/communities">{t("back")}</Link>
            </Button>
          }
        />
      ) : (
        <ListMessage
          tone="error"
          icon={<AlertCircle aria-hidden />}
          title={t("loadError")}
          description={query.error?.message}
          action={
            <Button variant="outline" className="h-10 rounded-xl" onClick={() => void query.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      )}
    </div>
  );
}

function CommunityBody({ community: c }: { community: Community }) {
  const t = useTranslations("communities");
  const td = useTranslations("communities.detail");
  const router = useRouter();
  const { user } = useSession();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const update = useUpdateCommunity(c.id);
  const remove = useDeleteCommunity(c.id);
  const reset = useResetInvite(c.id);
  const removeMember = useRemoveMember(c.id);

  const ownerName = c.owner.display_name ?? td("deletedUser");
  const fail = (error: unknown) =>
    toast.error(td("actionError"), { description: communityErrorMessage(error, t) });

  const onConfirm = async () => {
    const action = confirm;
    setConfirm(null);
    if (!action) return;
    try {
      if (action.kind === "remove") {
        await removeMember.mutateAsync(action.userId);
        toast.success(td("removed", { name: action.name }));
      } else if (action.kind === "leave") {
        await removeMember.mutateAsync(user!.id);
        toast.success(td("left", { name: c.name }));
        router.replace("/communities");
      } else if (action.kind === "delete") {
        await remove.mutateAsync();
        toast.success(td("deleted"));
        router.replace("/communities");
      } else {
        await reset.mutateAsync();
        toast.success(td("linkReset"));
      }
    } catch (error) {
      fail(error);
    }
  };

  const menu: ActionMenuItem[] = c.is_owner
    ? [
        { label: td("resetLink"), icon: RefreshCw, onSelect: () => setConfirm({ kind: "reset" }) },
        {
          label: td("delete"),
          icon: Trash2,
          destructive: true,
          onSelect: () => setConfirm({ kind: "delete" }),
        },
      ]
    : [
        { label: td("report"), icon: Flag, onSelect: () => setReporting(true) },
        {
          label: td("leave"),
          icon: LogOut,
          destructive: true,
          onSelect: () => setConfirm({ kind: "leave" }),
        },
      ];

  return (
    <>
      <section className={card} aria-labelledby="community-name">
        <div className="flex items-start gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white sm:size-16"
            style={{ backgroundColor: COMMUNITY_COLORS[c.color] }}
          >
            <UsersRound aria-hidden className="size-7" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1
              id="community-name"
              className="text-2xl font-bold leading-tight tracking-tight text-balance text-foreground [overflow-wrap:anywhere] sm:text-[1.75rem]"
            >
              {c.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("list.members", { count: c.members_count })}
              {" · "}
              {td.rich("foundedBy", {
                name: c.is_owner ? td("you") : ownerName,
                b: (chunks) => <span className="font-medium text-foreground/80">{chunks}</span>,
              })}
            </p>
          </div>
        </div>
        {c.description ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-pretty text-foreground/90 [overflow-wrap:anywhere]">
            {c.description}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <Button asChild className="h-10 min-w-0 flex-1 rounded-xl sm:flex-none">
            <Link href={communityMapHref(c.id)}>
              <MapIcon aria-hidden />
              {td("showOnMap")}
            </Link>
          </Button>
          {c.is_owner ? (
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-xl max-sm:w-10 max-sm:has-[>svg]:px-0"
              onClick={() => setEditing(true)}
              aria-label={td("edit")}
            >
              <Pencil aria-hidden />
              <span className="max-sm:sr-only">{td("edit")}</span>
            </Button>
          ) : null}
          <ActionMenu
            label={td("more")}
            triggerClassName="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-accent aria-expanded:bg-accent [&_svg]:size-4"
            trigger={<MoreHorizontal aria-hidden />}
            items={menu}
          />
        </div>
      </section>

      {c.is_owner && c.invite_code ? (
        <InviteLinkCard code={c.invite_code} communityName={c.name} />
      ) : null}

      <MembersSection
        community={c}
        viewerId={user?.id ?? null}
        removingId={removeMember.isPending ? removeMember.variables ?? null : null}
        onRemove={(userId, name) => setConfirm({ kind: "remove", userId, name })}
      />

      <CommunityFormDialog
        open={editing}
        onOpenChange={setEditing}
        initial={{ name: c.name, description: c.description, color: c.color }}
        pending={update.isPending}
        onSubmit={async (values) => {
          try {
            const res = await update.mutateAsync(values);
            toast.success(t("form.saved"));
            return res;
          } catch (error) {
            toast.error(t("form.saveError"), { description: communityErrorMessage(error, t) });
            throw error;
          }
        }}
      />

      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        targetType="community"
        targetId={c.id}
      />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "remove"
                ? td("confirmRemoveTitle", { name: confirm.name })
                : confirm?.kind === "leave"
                  ? td("confirmLeaveTitle", { name: c.name })
                  : confirm?.kind === "delete"
                    ? td("confirmDeleteTitle", { name: c.name })
                    : td("confirmResetTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "remove"
                ? td("confirmRemoveDescription")
                : confirm?.kind === "leave"
                  ? td("confirmLeaveDescription")
                  : confirm?.kind === "delete"
                    ? td("confirmDeleteDescription", { pins: c.pins_count })
                    : td("confirmResetDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{td("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.kind === "reset" ? undefined : buttonVariants({ variant: "destructive" })}
              onClick={() => void onConfirm()}
            >
              {confirm?.kind === "remove"
                ? td("remove")
                : confirm?.kind === "leave"
                  ? td("leave")
                  : confirm?.kind === "delete"
                    ? td("delete")
                    : td("resetLink")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MembersSection({
  community: c,
  viewerId,
  removingId,
  onRemove,
}: {
  community: Community;
  viewerId: string | null;
  removingId: string | null;
  onRemove: (userId: string, name: string) => void;
}) {
  const t = useTranslations("communities.detail");
  const locale = useLocale();
  const members = useCommunityMembers(c.id);

  return (
    <section className={card} aria-labelledby="members-title">
      <h2 id="members-title" className="mb-3 flex items-baseline gap-2 text-base font-semibold text-foreground">
        {t("membersTitle")}
        <span className="text-sm font-normal tabular-nums text-muted-foreground">{c.members_count}</span>
      </h2>
      {members.isLoading ? (
        <UserListSkeleton rows={3} />
      ) : members.error && members.items.length === 0 ? (
        <ListMessage
          tone="error"
          icon={<AlertCircle aria-hidden />}
          title={t("membersLoadError")}
          description={members.error.message}
          action={
            <Button variant="outline" className="h-10 rounded-xl" onClick={() => void members.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="-mx-2 flex flex-col gap-0.5">
            {members.items.map((m) => {
              const name = m.user.display_name ?? t("someone");
              const removable = c.is_owner && !m.is_owner;
              return (
                <UserRow
                  key={m.user.id}
                  id={m.user.id}
                  name={m.user.id === viewerId ? `${name} (${t("you")})` : name}
                  avatarUrl={m.user.avatar_url}
                  meta={
                    m.is_owner
                      ? t("founderBadge")
                      : t("joined", { time: formatTimeAgo(m.joined_at, locale) })
                  }
                  action={
                    removable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-muted-foreground hover:text-destructive"
                        disabled={removingId === m.user.id}
                        aria-label={t("removeLabel", { name })}
                        onClick={() => onRemove(m.user.id, name)}
                      >
                        {t("remove")}
                      </Button>
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
          <LoadMore
            hasNextPage={members.hasNextPage}
            isFetchingNextPage={members.isFetchingNextPage}
            fetchNextPage={members.fetchNextPage}
            error={members.error}
          />
        </>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className={card} aria-busy="true">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-2xl sm:size-16" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}
