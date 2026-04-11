"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { AdminUser } from "./types";
import { formatDate, initials } from "./utils";
import { AdminListShell } from "./AdminListShell";

interface UserListProps {
  items: AdminUser[];
  total: number;
  onDelete: (u: AdminUser) => void;
  pending: boolean;
}

export function UserList({ items, total, onDelete, pending }: UserListProps) {
  return (
    <AdminListShell
      count={items.length}
      total={total}
      emptyLabel="No members match."
    >
      <ul className="divide-y divide-border">
        {items.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-4 px-4 py-3 transition hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {initials(u.displayName || u.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.displayName || u.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email} · joined {formatDate(u.createdAt || u.created_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(u)}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </AdminListShell>
  );
}
