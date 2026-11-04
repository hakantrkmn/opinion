"use client";

import { Button } from "@/components/ui/button";
import {
  useFollowUser,
  useUnfollowUser,
} from "@/features/users/hooks/use-follow-mutations";
import { useSession } from "@/features/auth/hooks/useSession";
import { cn } from "@/lib/utils";
import { UserCheck, UserMinus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

interface FollowButtonProps {
  userId: string;
  /** From GET /api/users/:id → viewer.is_following (kept fresh optimistically). */
  isFollowing: boolean;
  userName?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Follow / Following toggle. The cached profile flips optimistically, so
 * the label changes on press (no spinner); on desktop "Following" reads
 * "Unfollow" on hover (Tailwind v4 gates hover to hover-capable pointers).
 */
export function FollowButton({
  userId,
  isFollowing,
  userName,
  disabled = false,
  className,
}: FollowButtonProps) {
  const t = useTranslations("profile.follow");
  const { user } = useSession();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  // After a press, don't flip straight to the red "Unfollow" hover state
  // under the still-hovering pointer; re-arm once it leaves.
  const [hoverArmed, setHoverArmed] = useState(true);

  if (!user) {
    return (
      <Button asChild className={cn("h-10 rounded-xl", className)}>
        <Link href={`/auth?redirect=${encodeURIComponent(`/u/${userId}`)}`}>
          <UserPlus aria-hidden />
          {t("signIn")}
        </Link>
      </Button>
    );
  }

  if (user.id === userId) return null;

  // State already flipped optimistically: ignore presses until the request settles.
  const isBusy = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      className={cn(
        "group/follow h-10 min-w-[8.5rem] rounded-xl transition-[transform,background-color,color,border-color] duration-150 ease-out active:scale-[0.97]",
        isFollowing &&
          hoverArmed &&
          "hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
        className
      )}
      onClick={() => {
        setHoverArmed(false);
        if (isFollowing) unfollowMutation.mutate(userId);
        else followMutation.mutate(userId);
      }}
      onMouseLeave={() => setHoverArmed(true)}
      disabled={disabled}
      aria-disabled={isBusy || undefined}
      aria-label={
        isFollowing
          ? userName
            ? t("followingLabel", { name: userName })
            : t("followingLabelAnon")
          : userName
            ? t("followLabel", { name: userName })
            : t("followLabelAnon")
      }
      onClickCapture={(e) => {
        if (isBusy) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {isFollowing ? (
        <>
          <span className={cn("inline-flex items-center gap-2", hoverArmed && "group-hover/follow:hidden")}>
            <UserCheck aria-hidden className="size-4" />
            {t("following")}
          </span>
          <span className={cn("hidden items-center gap-2", hoverArmed && "group-hover/follow:inline-flex")}>
            <UserMinus aria-hidden className="size-4" />
            {t("unfollow")}
          </span>
        </>
      ) : (
        <>
          <UserPlus aria-hidden />
          {t("follow")}
        </>
      )}
    </Button>
  );
}
