"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { AdminComment } from "./types";
import { formatDate } from "./utils";
import { AdminListShell } from "./AdminListShell";

interface CommentListProps {
  items: AdminComment[];
  total: number;
  onDelete: (c: AdminComment) => void;
  pending: boolean;
}

export function CommentList({
  items,
  total,
  onDelete,
  pending,
}: CommentListProps) {
  return (
    <AdminListShell
      count={items.length}
      total={total}
      emptyLabel="No comments match."
    >
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-4 px-4 py-3 transition hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{c.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-normal">
                  {c.profiles?.email}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {c.pins?.name}
                </Badge>
                {c.is_first_comment && (
                  <Badge variant="outline" className="font-normal">
                    origin
                  </Badge>
                )}
                <span>{formatDate(c.created_at)}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(c)}
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
