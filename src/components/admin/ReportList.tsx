"use client";

import {
  Flag,
  MapPin,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminReport } from "@/hooks/queries/use-admin";
import { AdminListShell } from "./AdminListShell";
import { formatDate } from "./utils";

interface ReportListProps {
  items: AdminReport[];
  total: number;
  onResolve: (report: AdminReport) => void;
  onDismiss: (report: AdminReport) => void;
  onDeleteTarget: (report: AdminReport) => void;
  pending: boolean;
}

const TARGET_ICON = {
  pin: MapPin,
  comment: MessageSquare,
  user: UserIcon,
} as const;

const REASON_LABEL: Record<AdminReport["reason"], string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  other: "Other",
};

export function ReportList({
  items,
  total,
  onResolve,
  onDismiss,
  onDeleteTarget,
  pending,
}: ReportListProps) {
  return (
    <AdminListShell
      count={items.length}
      total={total}
      emptyLabel="No reports here."
    >
      <ul className="divide-y divide-border">
        {items.map((r) => {
          const Icon = TARGET_ICON[r.target_type];
          const reporterLabel =
            r.reporter.display_name || r.reporter.email || r.reporter.id;
          const targetAuthorLabel =
            r.target_preview.authorName ||
            r.target_preview.authorEmail ||
            r.target_preview.authorId ||
            "—";
          return (
            <li key={r.id} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium uppercase tracking-wide">
                      {r.target_type}
                    </span>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      {REASON_LABEL[r.reason]}
                    </span>
                    <span>{formatDate(r.created_at)}</span>
                    {r.status !== "open" && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                        {r.status}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium">
                    {r.target_preview.missing
                      ? "(Target already removed)"
                      : r.target_preview.label || "(empty)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Author:{" "}
                    <span className="text-foreground">{targetAuthorLabel}</span>
                    {" · "}
                    Reported by:{" "}
                    <span className="text-foreground">{reporterLabel}</span>
                  </p>
                  {r.note && (
                    <p className="rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                      “{r.note}”
                    </p>
                  )}
                </div>
              </div>
              {r.status === "open" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(r)}
                    disabled={pending}
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(r)}
                    disabled={pending}
                  >
                    <Flag className="mr-1.5 h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                  {!r.target_preview.missing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteTarget(r)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete{" "}
                      {r.target_type === "user"
                        ? "user"
                        : r.target_type === "pin"
                        ? "pin"
                        : "comment"}
                    </Button>
                  )}
                </div>
              )}
              {r.status !== "open" && (
                <div className="mt-2 flex items-center gap-2 pl-12 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Closed
                  {r.resolved_at ? ` · ${formatDate(r.resolved_at)}` : ""}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AdminListShell>
  );
}
