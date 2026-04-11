"use client";

import { Button } from "@/components/ui/button";
import { MapPin, Trash2 } from "lucide-react";
import type { AdminPin } from "./types";
import { formatDate } from "./utils";
import { AdminListShell } from "./AdminListShell";

interface PinListProps {
  items: AdminPin[];
  total: number;
  onDelete: (p: AdminPin) => void;
  pending: boolean;
}

export function PinList({ items, total, onDelete, pending }: PinListProps) {
  return (
    <AdminListShell
      count={items.length}
      total={total}
      emptyLabel="No pins match."
    >
      <ul className="divide-y divide-border">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-4 px-4 py-3 transition hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.profiles?.email} · {formatDate(p.created_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(p)}
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
