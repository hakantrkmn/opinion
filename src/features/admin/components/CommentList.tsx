"use client";

import { pinMapHref } from "@/features/profile/components/sections/ProfileLists";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { useAdminComments } from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";
import { ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { AdminListShell } from "@/features/admin/components/AdminListShell";
import { adminIconAction, adminInlineLink, adminRow } from "@/features/admin/components/row-styles";
import type { AdminComment } from "@/features/admin/components/types";
import { formatDate } from "@/features/admin/components/utils";

interface CommentListProps {
  query: ReturnType<typeof useAdminComments>;
  onDelete: (c: AdminComment) => void;
  pending: boolean;
}

export function CommentList({ query, onDelete, pending }: CommentListProps) {
  const items = query.items;
  return (
    <AdminListShell
      label="Comments"
      count={items.length}
      total={query.firstPage?.total}
      emptyLabel="No comments match your search."
      isLoading={query.isLoading}
      error={query.error}
      hasMore={query.hasNextPage}
      isFetchingMore={query.isFetchingNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      onRetry={() => void query.refetch()}
    >
      {items.map((c) => (
        <li key={c.id} className={cn(adminRow, "items-start")}>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 whitespace-pre-line break-words text-sm">{c.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="max-w-full truncate">{c.user.email || c.user.display_name || "Deleted user"}</span>
              <span aria-hidden>·</span>
              <Link href={pinMapHref({ id: c.pin.id })} className={cn(adminInlineLink, "max-w-full truncate text-foreground/80")}>
                {c.pin.name}
              </Link>
              <span aria-hidden>·</span>
              <span>{formatDate(c.created_at)}</span>
              {c.is_first_comment ? (
                <Badge variant="outline" className="font-medium" title="The comment the pin was created with">
                  Origin
                </Badge>
              ) : null}
              {c.photo_url ? (
                <a
                  href={c.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(adminInlineLink, "inline-flex items-center gap-1 text-foreground/80")}
                >
                  <ImageIcon aria-hidden className="size-3" />
                  Photo
                </a>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(c)}
            disabled={pending}
            className={adminIconAction}
            aria-label="Delete comment"
            title="Delete comment"
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </AdminListShell>
  );
}
