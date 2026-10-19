"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { useAdminUsers } from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { AdminListShell } from "@/features/admin/components/AdminListShell";
import { adminIconAction, adminInlineLink, adminRow } from "@/features/admin/components/row-styles";
import type { AdminUser } from "@/features/admin/components/types";
import { formatDate } from "@/features/admin/components/utils";

interface UserListProps {
  query: ReturnType<typeof useAdminUsers>;
  currentUserId?: string;
  onDelete: (u: AdminUser) => void;
  pending: boolean;
}

export function UserList({ query, currentUserId, onDelete, pending }: UserListProps) {
  const items = query.items;
  return (
    <AdminListShell
      label="Members"
      count={items.length}
      total={query.firstPage?.total}
      emptyLabel="No members match your search."
      isLoading={query.isLoading}
      error={query.error}
      hasMore={query.hasNextPage}
      isFetchingMore={query.isFetchingNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      onRetry={() => void query.refetch()}
    >
      {items.map((u) => {
        const deleted = !!u.deleted_at;
        const isSelf = u.id === currentUserId;
        const canDelete = !deleted && u.role !== "admin" && !isSelf;
        const name = deleted ? "Deleted user" : u.display_name || u.email;
        return (
          <li key={u.id} className={adminRow}>
            <Avatar src={deleted ? null : u.avatar_url} alt="" size="md" fallbackText={name} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                {deleted ? (
                  <span className="truncate text-muted-foreground">{name}</span>
                ) : (
                  <Link href={isSelf ? "/profile" : `/u/${u.id}`} className={cn(adminInlineLink, "truncate")}>
                    {name}
                  </Link>
                )}
                {u.role === "admin" ? <Badge variant="secondary" className="shrink-0 font-medium">Admin</Badge> : null}
                {deleted ? <Badge variant="outline" className="shrink-0 font-medium">Deleted</Badge> : null}
                {!deleted && !u.email_verified ? (
                  <Badge variant="outline" className="shrink-0 font-medium text-muted-foreground">Unverified</Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {deleted ? u.id : u.email} · joined {formatDate(u.created_at)}
                {deleted && u.deleted_at ? ` · deleted ${formatDate(u.deleted_at)}` : ""}
              </p>
            </div>
            {canDelete ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(u)}
                disabled={pending}
                className={adminIconAction}
                aria-label={`Delete account of ${name}`}
                title="Delete account"
              >
                <Trash2 aria-hidden />
              </Button>
            ) : null}
          </li>
        );
      })}
    </AdminListShell>
  );
}
