"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { UserModerationActions } from "@/features/moderation/components/UserModerationActions";
import { ProfileHero } from "@/features/profile/components/sections/ProfileHero";
import {
  EmptyState,
  ErrorState,
  ProfileCommentsList,
  ProfilePinsList,
} from "@/features/profile/components/sections/ProfileLists";
import { ProfileTabs } from "@/features/profile/components/sections/ProfileTabs";
import { ConnectionListDialog } from "@/features/profile/components/social/ConnectionListDialog";
import { FollowButton } from "@/features/profile/components/social/FollowButton";
import { Button } from "@/components/ui/button";
import { useUnblockUser } from "@/features/moderation/hooks/use-block-mutations";
import {
  usePublicUser,
  usePublicUserComments,
  usePublicUserPins,
} from "@/features/profile/hooks/use-user-profile";
import { ArrowLeft, Loader2, MessageCircle, ShieldOff, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PublicProfileClient({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"pins" | "comments">("pins");
  const [dialog, setDialog] = useState<"followers" | "following" | null>(null);
  const unblock = useUnblockUser();

  const profileQuery = usePublicUser(userId);
  const data = profileQuery.data;
  const isBlocked = data?.viewer.is_blocked ?? false;
  const canLoadContent = !!data && !isBlocked;
  const name = data?.user.display_name || "Unnamed user";

  const pinsQuery = usePublicUserPins(userId, canLoadContent && tab === "pins");
  const commentsQuery = usePublicUserComments(userId, canLoadContent && tab === "comments");

  const notFound = (profileQuery.error as { status?: number } | null)?.status === 404;
  if (notFound) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <UserX aria-hidden className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">Profile not available</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            This account doesn&apos;t exist, was deleted, or isn&apos;t visible to you.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link href="/">
            <ArrowLeft aria-hidden />
            Back to map
          </Link>
        </Button>
      </div>
    );
  }

  if (profileQuery.error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <ErrorState message={profileQuery.error.message} onRetry={() => void profileQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
      <ProfileHero
        profile={data?.user ?? null}
        stats={data?.stats}
        isLoading={profileQuery.isLoading}
        actions={
          data && !data.viewer.is_self ? (
            <>
              {!isBlocked ? (
                <FollowButton
                  userId={userId}
                  userName={name}
                  isFollowing={data.viewer.is_following}
                  className="flex-1 sm:flex-none"
                />
              ) : null}
              <UserModerationActions userId={userId} userName={name} isBlocked={isBlocked} />
            </>
          ) : null
        }
        onOpenFollowers={canLoadContent ? () => setDialog("followers") : undefined}
        onOpenFollowing={canLoadContent ? () => setDialog("following") : undefined}
      />

      {isBlocked ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldOff aria-hidden className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">You blocked {name}</p>
            <p className="max-w-[40ch] text-sm text-pretty text-muted-foreground">
              You can&apos;t see each other&apos;s pins or comments. Unblock to see their activity
              again.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            disabled={unblock.isPending}
            onClick={() => unblock.mutate(userId)}
          >
            {unblock.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {unblock.isPending ? "Unblocking…" : "Unblock"}
          </Button>
        </div>
      ) : data ? (
        <ProfileTabs
          value={tab}
          onValueChange={setTab}
          pinsCount={data.stats.total_pins}
          commentsCount={data.stats.total_comments}
          pins={
            <ProfilePinsList
              pins={pinsQuery.items}
              state={pinsQuery}
              empty={
                <EmptyState
                  icon={<PinIcon className="size-5" />}
                  title="No pins yet"
                  description={`${name} hasn't dropped any pins.`}
                />
              }
            />
          }
          comments={
            <ProfileCommentsList
              comments={commentsQuery.items}
              state={commentsQuery}
              empty={
                <EmptyState
                  icon={<MessageCircle aria-hidden className="size-5" />}
                  title="No comments yet"
                  description={`${name} hasn't commented on any pins.`}
                />
              }
            />
          }
        />
      ) : (
        <div aria-hidden className="h-11 animate-pulse rounded-xl bg-muted/60" />
      )}

      <ConnectionListDialog
        userId={userId}
        userName={name}
        open={dialog === "followers"}
        onOpenChange={(open) => setDialog(open ? "followers" : null)}
        type="followers"
      />
      <ConnectionListDialog
        userId={userId}
        userName={name}
        open={dialog === "following"}
        onOpenChange={(open) => setDialog(open ? "following" : null)}
        type="following"
      />
    </div>
  );
}
