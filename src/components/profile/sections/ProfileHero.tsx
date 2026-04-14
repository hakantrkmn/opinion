"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import { formatCompactNumber, formatShortDate } from "@/lib/formatters";
import type { PublicUserProfile, UserStats } from "@/types";
import {
  Calendar,
  MessageCircle,
  RefreshCcw,
  TrendingUp,
  UserPlus2,
} from "lucide-react";
import type React from "react";

interface ProfileHeroProps {
  profile: PublicUserProfile | null;
  stats: UserStats["stats"] | null | undefined;
  email?: string;
  primaryAction?: React.ReactNode;
  onEdit?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

function StatButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-base font-semibold text-foreground tabular-nums">
        {formatCompactNumber(value)}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );

  if (!onClick) {
    return <div className="flex flex-col">{content}</div>;
  }

  return (
    <button
      type="button"
      className="flex min-h-11 flex-col rounded-xl border border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export function ProfileHero({
  profile,
  stats,
  email,
  primaryAction,
  onEdit,
  onRefresh,
  isRefreshing = false,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeroProps) {
  const totalPins = stats?.totalPins || 0;
  const totalComments = stats?.totalComments || 0;
  const netScore = (stats?.totalLikes || 0) - (stats?.totalDislikes || 0);

  return (
    <section className="rounded-[2rem] border border-border/50 bg-card/80 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar
          src={profile?.avatar_url}
          alt={profile?.display_name || email || "User"}
          size="xl"
          fallbackText={profile?.display_name || email || "User"}
          className="h-20 w-20 text-xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {profile?.display_name || "Anonymous User"}
              </h1>
              {email ? (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {profile?.created_at ? formatShortDate(profile.created_at) : "Recently"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp
                    className={`h-4 w-4 ${netScore >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  />
                  Score {netScore >= 0 ? "+" : ""}
                  {formatCompactNumber(netScore)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {primaryAction}
              {onEdit ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={onEdit}
                >
                  Edit Profile
                </Button>
              ) : null}
              {onRefresh ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh profile"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatButton label="Pins" value={totalPins} />
            <StatButton label="Comments" value={totalComments} />
            <StatButton
              label="Followers"
              value={stats?.followersCount || 0}
              onClick={onOpenFollowers}
            />
            <StatButton
              label="Following"
              value={stats?.followingCount || 0}
              onClick={onOpenFollowing}
            />
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border/50 px-3 py-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                {totalPins > totalComments ? (
                  <PinIcon className="h-4 w-4" />
                ) : totalComments > 0 ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <UserPlus2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Activity</p>
                <p className="text-sm font-medium text-foreground">
                  {stats?.lastActivityAt
                    ? formatShortDate(stats.lastActivityAt)
                    : "No activity yet"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
