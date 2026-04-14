"use client";

import { Button } from "@/components/ui/button";
import {
  useFollowUser,
  useUnfollowUser,
} from "@/hooks/mutations/use-follow-mutations";
import { useFollowStatus } from "@/hooks/queries/use-user-social";
import { useSession } from "@/hooks/useSession";
import { Loader2, UserPlus, UserRoundCheck } from "lucide-react";
import Link from "next/link";

interface FollowButtonProps {
  userId: string;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const { user } = useSession();
  const isOwnProfile = user?.id === userId;
  const followStatus = useFollowStatus(userId, !!user && !isOwnProfile);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  if (!user) {
    return (
      <Button asChild className="h-11 rounded-xl">
        <Link href="/auth">Sign In to Follow</Link>
      </Button>
    );
  }

  if (isOwnProfile) return null;

  const isBusy = followMutation.isPending || unfollowMutation.isPending;
  const isFollowing = followStatus.data?.isFollowing ?? false;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      className="h-11 rounded-xl"
      onClick={() =>
        isFollowing
          ? unfollowMutation.mutate(userId)
          : followMutation.mutate(userId)
      }
      disabled={isBusy || followStatus.isLoading}
      aria-label={isFollowing ? "Unfollow user" : "Follow user"}
    >
      {isBusy || followStatus.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserRoundCheck className="h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
