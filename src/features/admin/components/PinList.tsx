"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { pinMapHref } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import type { useAdminPins } from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";
import { MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { AdminListShell } from "@/features/admin/components/AdminListShell";
import { adminIconAction, adminInlineLink, adminRow } from "@/features/admin/components/row-styles";
import type { AdminPin } from "@/features/admin/components/types";
import { formatDate } from "@/features/admin/components/utils";

interface PinListProps {
  query: ReturnType<typeof useAdminPins>;
  onDelete: (p: AdminPin) => void;
  pending: boolean;
}

export function PinList({ query, onDelete, pending }: PinListProps) {
  const items = query.items;
  return (
    <AdminListShell
      label="Pins"
      count={items.length}
      total={query.firstPage?.total}
      emptyLabel="No pins match your search."
      isLoading={query.isLoading}
      error={query.error}
      hasMore={query.hasNextPage}
      isFetchingMore={query.isFetchingNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      onRetry={() => void query.refetch()}
    >
      {items.map((p) => (
        <li key={p.id} className={adminRow}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PinIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={pinMapHref(p)} className={cn(adminInlineLink, "block truncate text-sm font-medium")}>
              {p.name}
            </Link>
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{p.user.email || p.user.display_name || "Deleted user"}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">{formatDate(p.created_at)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                <MessageSquare aria-hidden className="size-3" />
                {p.comments_count}
                <span className="sr-only">comments</span>
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(p)}
            disabled={pending}
            className={adminIconAction}
            aria-label={`Delete pin ${p.name}`}
            title="Delete pin"
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </AdminListShell>
  );
}
