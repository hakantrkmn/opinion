"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type {
  AdminAnalytics,
  AdminComment,
  AdminPin,
  AdminUser,
} from "./types";
import { formatNumber, initials } from "./utils";

interface OverviewPanelProps {
  analytics?: AdminAnalytics;
  users: AdminUser[];
  pins: AdminPin[];
  comments: AdminComment[];
}

export function OverviewPanel({
  analytics,
  users,
  pins,
  comments,
}: OverviewPanelProps) {
  const totalReactions =
    (analytics?.totalLikes || 0) + (analytics?.totalDislikes || 0);
  const likeShare =
    totalReactions > 0
      ? Math.round(((analytics?.totalLikes || 0) / totalReactions) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sentiment</CardTitle>
          <CardDescription>Approval rate across all comments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4">
            <div className="text-4xl font-semibold tabular-nums">
              {likeShare}
              <span className="ml-1 text-xl text-muted-foreground">%</span>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div className="flex items-center justify-end gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5" />
                {formatNumber(analytics?.totalLikes)} likes
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <ThumbsDown className="h-3.5 w-3.5" />
                {formatNumber(analytics?.totalDislikes)} dislikes
              </div>
              <div className="mt-1">
                {formatNumber(analytics?.totalVotes)} cast
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-primary transition-all"
              style={{ width: `${likeShare}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top contributors</CardTitle>
          <CardDescription>By total likes received</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.topUsers && analytics.topUsers.length > 0 ? (
            <ol className="space-y-3">
              {analytics.topUsers.slice(0, 5).map((u, i) => (
                <li key={u.user_id} className="flex items-center gap-3">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {initials(u.users?.email)}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm">
                    {u.users?.email || "—"}
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {u.total_likes_received}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Snapshot</CardTitle>
          <CardDescription>Latest activity in this batch</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              New members
            </p>
            <ul className="space-y-2">
              {users.slice(0, 3).map((u) => (
                <li key={u.id} className="truncate text-sm">
                  {u.displayName || u.email}
                </li>
              ))}
              {users.length === 0 && (
                <li className="text-sm text-muted-foreground">—</li>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Latest pins
            </p>
            <ul className="space-y-2">
              {pins.slice(0, 3).map((p) => (
                <li key={p.id} className="truncate text-sm">
                  {p.name}
                </li>
              ))}
              {pins.length === 0 && (
                <li className="text-sm text-muted-foreground">—</li>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Latest comments
            </p>
            <ul className="space-y-2">
              {comments.slice(0, 3).map((c) => (
                <li key={c.id} className="line-clamp-1 text-sm">
                  {c.text}
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-muted-foreground">—</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
