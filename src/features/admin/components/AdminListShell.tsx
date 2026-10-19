"use client";

import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox, RotateCcw } from "lucide-react";
import { formatNumber } from "@/features/admin/components/utils";

interface AdminListShellProps {
  count: number;
  total?: number;
  emptyLabel: string;
  isLoading?: boolean;
  error?: Error | null;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  /** Accessible name of the list. */
  label: string;
  children: React.ReactNode;
}

export function AdminListShell({
  count,
  total,
  emptyLabel,
  isLoading = false,
  error = null,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  onRetry,
  label,
  children,
}: AdminListShellProps) {
  if (isLoading) {
    return (
      <div aria-busy className="overflow-hidden rounded-2xl border border-border/60">
        <span className="sr-only">Loading {label.toLowerCase()}…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2 opacity-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && count === 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/40 px-6 py-14 text-center"
      >
        <AlertCircle aria-hidden className="size-5 text-destructive" />
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {onRetry ? (
          <Button variant="outline" className="h-10 rounded-xl" onClick={onRetry}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Inbox aria-hidden className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing <span className="tabular-nums text-foreground">{formatNumber(count)}</span>
        {typeof total === "number" && count !== total ? (
          <>
            {" "}
            of <span className="tabular-nums">{formatNumber(total)}</span>
          </>
        ) : null}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <ul aria-label={label} className="divide-y divide-border/60">
          {children}
        </ul>
      </div>
      {onLoadMore ? (
        <LoadMore
          hasNextPage={hasMore}
          isFetchingNextPage={isFetchingMore}
          fetchNextPage={onLoadMore}
          error={error}
          className="border border-border/60"
        />
      ) : null}
    </div>
  );
}
