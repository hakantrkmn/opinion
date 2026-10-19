"use client";

import { formatCount } from "@/features/profile/lib/format";
import { cn } from "@/lib/utils";
import type { UserStats } from "@/types/userTypes";

/** Pins / comments / followers / following strip at the bottom of the hero. */
export function ProfileStatsGrid({
  stats,
  onOpenFollowers,
  onOpenFollowing,
}: {
  stats: UserStats | null | undefined;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}) {
  const items = [
    { label: "Pins", value: stats?.total_pins },
    { label: "Comments", value: stats?.total_comments },
    { label: "Followers", value: stats?.followers_count, onClick: onOpenFollowers },
    { label: "Following", value: stats?.following_count, onClick: onOpenFollowing },
  ];

  return (
    <ul className="mt-5 grid grid-cols-4 divide-x divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
      {items.map((item) => {
        const content = (
          <>
            <span className="text-lg font-semibold leading-none tabular-nums text-foreground sm:text-xl">
              {stats ? formatCount(item.value) : "–"}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </>
        );
        const base =
          "flex h-full min-h-[68px] w-full flex-col items-center justify-center gap-1.5 px-1 py-3 text-center";
        return (
          <li key={item.label}>
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                aria-haspopup="dialog"
                className={cn(
                  base,
                  "outline-none transition-colors duration-150 hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted"
                )}
              >
                {content}
              </button>
            ) : (
              <div className={base}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
