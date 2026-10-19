"use client";

import { Avatar } from "@/components/ui/Avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { ActivityChart } from "@/features/admin/components/ActivityChart";
import type { AdminAnalytics } from "@/features/admin/components/types";
import { formatNumber } from "@/features/admin/components/utils";

interface OverviewPanelProps {
  analytics?: AdminAnalytics;
  loading?: boolean;
}

export function OverviewPanel({ analytics, loading = false }: OverviewPanelProps) {
  const likes = analytics?.total_likes ?? 0;
  const dislikes = analytics?.total_dislikes ?? 0;
  const totalReactions = likes + dislikes;
  const likeShare = totalReactions > 0 ? Math.round((likes / totalReactions) * 100) : 0;
  const daily = analytics?.daily ?? [];
  const last14 = daily.reduce((sum, d) => sum + d.pins + d.comments, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="gap-4 rounded-2xl lg:col-span-3">
        <CardHeader>
          <CardTitle>Activity, last 14 days</CardTitle>
          <CardDescription>
            New pins and comments per day
            {analytics ? (
              <>
                {" "}
                · <span className="tabular-nums text-foreground">{formatNumber(last14)}</span> total ·{" "}
                {formatNumber(analytics.active_push_tokens)} active{" "}
                {analytics.active_push_tokens === 1 ? "device" : "devices"} ·{" "}
                {formatNumber(analytics.deleted_users)} deleted{" "}
                {analytics.deleted_users === 1 ? "account" : "accounts"}
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : daily.length === 0 ? (
            <p className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          ) : (
            <ActivityChart daily={daily} />
          )}
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl lg:col-span-2">
        <CardHeader>
          <CardTitle>Sentiment</CardTitle>
          <CardDescription>Share of likes across all comment votes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <p className="text-4xl font-semibold tabular-nums">
                  {likeShare}
                  <span className="ml-0.5 text-xl text-muted-foreground">%</span>
                  <span className="sr-only"> likes</span>
                </p>
                <div className="flex flex-col items-end gap-1 text-xs tabular-nums text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp aria-hidden className="size-3.5" />
                    {formatNumber(likes)} likes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ThumbsDown aria-hidden className="size-3.5" />
                    {formatNumber(dislikes)} dislikes
                  </span>
                </div>
              </div>
              <div
                role="meter"
                aria-label="Like share"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={likeShare}
                className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full"
              >
                <div className="rounded-l-full bg-primary" style={{ width: `${likeShare}%` }} />
                <div className="flex-1 rounded-r-full bg-muted" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl">
        <CardHeader>
          <CardTitle>Top contributors</CardTitle>
          <CardDescription>By pins created</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : analytics?.top_users?.length ? (
            <ol className="flex flex-col gap-1">
              {analytics.top_users.map((u, i) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="w-4 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <Avatar src={u.avatar_url} alt="" size="sm" fallbackText={u.display_name ?? "?"} />
                    <span className="min-w-0 flex-1 truncate text-sm">{u.display_name || "—"}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatNumber(u.total_pins)} pins
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
