"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Flag, Heart, MapPin, MessageSquare, Users } from "lucide-react";
import type { AdminAnalytics } from "@/features/admin/components/types";
import { formatNumber } from "@/features/admin/components/utils";

interface AdminStatsProps {
  analytics?: AdminAnalytics;
  loading: boolean;
  onOpenReports?: () => void;
}

export function AdminStats({ analytics, loading, onOpenReports }: AdminStatsProps) {
  const openReports = analytics?.open_reports ?? 0;
  const items = [
    { label: "Members", value: analytics?.total_users, icon: Users },
    { label: "Pins", value: analytics?.total_pins, icon: MapPin },
    { label: "Comments", value: analytics?.total_comments, icon: MessageSquare },
    {
      label: "Votes",
      value: analytics ? analytics.total_likes + analytics.total_dislikes : undefined,
      icon: Heart,
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4">
          <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            {item.label}
            <item.icon aria-hidden className="size-4" />
          </span>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-semibold leading-8 tabular-nums">{formatNumber(item.value)}</span>
          )}
        </li>
      ))}
      <li className="col-span-2 md:col-span-1">
        <button
          type="button"
          onClick={onOpenReports}
          className={cn(
            "flex h-full w-full flex-col gap-2 rounded-2xl border p-4 text-left outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
            openReports > 0
              ? "border-destructive/40 bg-destructive/[0.04] hover:bg-destructive/[0.08]"
              : "border-border/60 bg-card hover:bg-muted/50"
          )}
        >
          <span
            className={cn(
              "flex items-center justify-between text-xs font-medium",
              openReports > 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            Open reports
            <Flag aria-hidden className="size-4" />
          </span>
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <span className="text-2xl font-semibold leading-8 tabular-nums">{formatNumber(openReports)}</span>
          )}
        </button>
      </li>
    </ul>
  );
}
