"use client";

import { Button } from "@/components/ui/button";
import { Activity, Loader2, RefreshCw } from "lucide-react";

interface AdminHeaderProps {
  onRefresh: () => void;
  refreshing?: boolean;
  onRecomputeStats: () => void;
  recomputing: boolean;
}

export function AdminHeader({
  onRefresh,
  refreshing = false,
  onRecomputeStats,
  recomputing,
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Moderate reports, members, pins and comments, and send notifications.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-10 flex-1 rounded-xl sm:flex-none"
          onClick={onRecomputeStats}
          disabled={recomputing}
          title="Rebuild the per-user statistics tables"
        >
          {recomputing ? <Loader2 aria-hidden className="animate-spin" /> : <Activity aria-hidden />}
          {recomputing ? "Recomputing…" : "Recompute stats"}
        </Button>
        <Button
          variant="outline"
          className="h-10 flex-1 rounded-xl sm:flex-none"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw aria-hidden className={refreshing ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>
    </header>
  );
}
