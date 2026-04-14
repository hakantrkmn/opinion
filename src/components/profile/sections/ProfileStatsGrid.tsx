"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { formatCompactNumber, formatShortDate } from "@/lib/formatters";
import type { UserStats } from "@/types";
import {
  Calendar,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Vote,
} from "lucide-react";

const statCards = [
  { key: "totalPins", label: "Pins Created", icon: PinIcon, accent: "text-emerald-500" },
  { key: "totalComments", label: "Comments", icon: MessageCircle, accent: "text-foreground" },
  { key: "totalLikes", label: "Likes Received", icon: ThumbsUp, accent: "text-emerald-500" },
  { key: "totalDislikes", label: "Dislikes Received", icon: ThumbsDown, accent: "text-red-500" },
  { key: "totalVotesGiven", label: "Votes Given", icon: Vote, accent: "text-foreground" },
] as const;

export function ProfileStatsGrid({
  stats,
}: {
  stats: UserStats["stats"] | null | undefined;
}) {
  if (!stats) return null;

  const netScore = (stats.totalLikes || 0) - (stats.totalDislikes || 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key] || 0;

        return (
          <article
            key={card.key}
            className="rounded-2xl border border-border/50 bg-card/80 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className={`h-4 w-4 ${card.accent}`} />
              <span>{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCompactNumber(value)}
            </p>
          </article>
        );
      })}

      <article className="rounded-2xl border border-border/50 bg-card/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp
            className={`h-4 w-4 ${netScore >= 0 ? "text-emerald-500" : "text-red-500"}`}
          />
          <span>Net Score</span>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {netScore >= 0 ? "+" : ""}
          {formatCompactNumber(netScore)}
        </p>
      </article>

      <article className="rounded-2xl border border-border/50 bg-card/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-foreground" />
          <span>Last Active</span>
        </div>
        <p className="text-base font-semibold text-foreground">
          {stats.lastActivityAt ? formatShortDate(stats.lastActivityAt) : "No activity yet"}
        </p>
      </article>
    </div>
  );
}
