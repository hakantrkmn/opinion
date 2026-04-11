"use client";

import { Search } from "lucide-react";

interface AdminListShellProps {
  count: number;
  total: number;
  emptyLabel: string;
  children: React.ReactNode;
}

export function AdminListShell({
  count,
  total,
  emptyLabel,
  children,
}: AdminListShellProps) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <Search className="h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="text-foreground">{count}</span>
          {count !== total && <> of {total}</>}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {children}
      </div>
    </div>
  );
}
