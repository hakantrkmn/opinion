"use client";

import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";

interface AdminHeaderProps {
  onRefresh: () => void;
  onRecomputeStats: () => void;
  recomputing: boolean;
}

export function AdminHeader({
  onRefresh,
  onRecomputeStats,
  recomputing,
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage members, pins, and comments.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRecomputeStats}
          disabled={recomputing}
        >
          <Activity
            className={`mr-2 h-4 w-4 ${recomputing ? "animate-pulse" : ""}`}
          />
          Recompute stats
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </header>
  );
}
