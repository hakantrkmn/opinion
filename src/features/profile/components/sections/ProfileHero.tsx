"use client";

import { formatJoined, formatSignedCount } from "@/features/profile/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { formatTimeAgo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PublicUserProfile, UserStats } from "@/types/userTypes";
import { CalendarDays, Clock, TrendingDown, TrendingUp } from "lucide-react";
import type React from "react";
import { ProfileStatsGrid } from "@/features/profile/components/sections/ProfileStatsGrid";

interface ProfileHeroProps {
  profile: PublicUserProfile | null;
  stats: UserStats | null | undefined;
  isLoading?: boolean;
  /** Secondary line under the name (own profile shows the email). */
  subtitle?: React.ReactNode;
  /** Replaces the static avatar (own profile: uploader). */
  avatarSlot?: React.ReactNode;
  /** Replaces the static name heading (own profile: inline editor). */
  nameSlot?: React.ReactNode;
  actions?: React.ReactNode;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

const card = "rounded-3xl border border-border/60 bg-card p-5 shadow-xs sm:p-6";

export function ProfileHero({
  profile,
  stats,
  isLoading = false,
  subtitle,
  avatarSlot,
  nameSlot,
  actions,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeroProps) {
  if (isLoading && !profile) return <ProfileHeroSkeleton />;

  const name = profile?.display_name || "Unnamed user";
  const score = (stats?.total_likes_received ?? 0) - (stats?.total_dislikes_received ?? 0);
  const ScoreIcon = score < 0 ? TrendingDown : TrendingUp;

  return (
    <section aria-label="Profile" className={card}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
          {avatarSlot ?? (
            <Avatar
              src={profile?.avatar_url}
              alt={name}
              size="xl"
              fallbackText={name}
              className="size-20 text-2xl sm:size-24"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {nameSlot ?? (
              <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
                {name}
              </h1>
            )}
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden className="size-3.5" />
                Joined {formatJoined(profile?.created_at)}
              </li>
              {stats?.last_activity_at ? (
                <li className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="size-3.5" />
                  Active {formatTimeAgo(stats.last_activity_at)}
                </li>
              ) : null}
              {stats ? (
                <li
                  className="inline-flex items-center gap-1"
                  title={`${stats.total_likes_received} likes, ${stats.total_dislikes_received} dislikes received`}
                >
                  <ScoreIcon
                    aria-hidden
                    className={cn(
                      "size-3.5",
                      score < 0 ? "text-destructive" : score > 0 ? "text-primary" : undefined
                    )}
                  />
                  <span className="tabular-nums">Score {formatSignedCount(score)}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
      </div>

      <ProfileStatsGrid
        stats={stats}
        onOpenFollowers={onOpenFollowers}
        onOpenFollowing={onOpenFollowing}
      />
    </section>
  );
}

export function ProfileHeroSkeleton() {
  return (
    <section aria-busy className={card}>
      <span className="sr-only">Loading profile…</span>
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="size-20 shrink-0 animate-pulse rounded-full bg-muted sm:size-24" />
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-56 max-w-full animate-pulse rounded-md bg-muted/70" />
          <div className="h-3.5 w-40 animate-pulse rounded-md bg-muted/50" />
        </div>
      </div>
      <div className="mt-5 grid h-[68px] grid-cols-4 animate-pulse rounded-2xl bg-muted/40" />
    </section>
  );
}
