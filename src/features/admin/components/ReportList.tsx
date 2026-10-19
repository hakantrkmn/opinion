"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { pinMapHref } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import type { AdminReport, useAdminReports } from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";
import { Check, MessageSquare, Trash2, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { AdminListShell } from "@/features/admin/components/AdminListShell";
import { adminInlineLink } from "@/features/admin/components/row-styles";
import { formatDate } from "@/features/admin/components/utils";

interface ReportListProps {
  query: ReturnType<typeof useAdminReports>;
  onResolve: (report: AdminReport) => void;
  onDismiss: (report: AdminReport) => void;
  onDeleteTarget: (report: AdminReport) => void;
  /** Id of the report an action is running for. */
  pendingId?: string | null;
  emptyLabel?: string;
}

const TARGET_ICON = {
  pin: PinIcon,
  comment: MessageSquare,
  user: UserIcon,
} as const;

const TARGET_LABEL = { pin: "Pin", comment: "Comment", user: "User" } as const;

const REASON_LABEL: Record<AdminReport["reason"], string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  other: "Other",
};

const STATUS_STYLE: Record<AdminReport["status"], string> = {
  open: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  resolved: "bg-primary/10 text-primary",
  dismissed: "bg-muted text-muted-foreground",
};

function personLabel(p: AdminReport["reporter"]) {
  return p ? p.display_name || p.email || p.id : "Deleted user";
}

export function ReportList({
  query,
  onResolve,
  onDismiss,
  onDeleteTarget,
  pendingId = null,
  emptyLabel = "No reports here.",
}: ReportListProps) {
  const items = query.items;
  return (
    <AdminListShell
      label="Reports"
      count={items.length}
      total={query.firstPage?.total}
      emptyLabel={emptyLabel}
      isLoading={query.isLoading}
      error={query.error}
      hasMore={query.hasNextPage}
      isFetchingMore={query.isFetchingNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      onRetry={() => void query.refetch()}
    >
      {items.map((r) => {
        const Icon = TARGET_ICON[r.target_type];
        const busy = pendingId === r.id;
        const targetText = r.target.missing ? "Already removed" : r.target.label || "(empty)";
        const targetHref = r.target.missing
          ? null
          : r.target_type === "pin"
            ? pinMapHref({ id: r.target_id })
            : r.target_type === "user"
              ? `/u/${r.target_id}`
              : null;

        return (
          <li key={r.id} className={cn("flex flex-col gap-3 px-4 py-4", busy && "opacity-60")}>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                    {TARGET_LABEL[r.target_type]}
                  </span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                    {REASON_LABEL[r.reason]}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", STATUS_STYLE[r.status])}>
                    {r.status}
                  </span>
                  <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                <p className={cn("line-clamp-2 break-words text-sm font-medium", r.target.missing && "italic text-muted-foreground")}>
                  {targetHref ? (
                    <Link href={targetHref} className={adminInlineLink}>
                      {targetText}
                    </Link>
                  ) : (
                    targetText
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.target_type !== "user" ? (
                    <>
                      By <span className="text-foreground">{personLabel(r.target.author)}</span> ·{" "}
                    </>
                  ) : null}
                  Reported by <span className="text-foreground">{personLabel(r.reporter)}</span>
                </p>
                {r.note ? (
                  <blockquote className="rounded-lg border-l-2 border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground/80">
                    {r.note}
                  </blockquote>
                ) : null}
              </div>
            </div>

            {r.status === "open" ? (
              <div className="flex flex-wrap items-center gap-2 sm:pl-[3.25rem]">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => onResolve(r)}
                  disabled={busy}
                  title="Mark as handled and keep the content"
                >
                  <Check aria-hidden />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-lg"
                  onClick={() => onDismiss(r)}
                  disabled={busy}
                  title="Close without action"
                >
                  <X aria-hidden />
                  Dismiss
                </Button>
                {!r.target.missing ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto"
                    onClick={() => onDeleteTarget(r)}
                    disabled={busy}
                  >
                    <Trash2 aria-hidden />
                    Remove {TARGET_LABEL[r.target_type].toLowerCase()}
                  </Button>
                ) : null}
              </div>
            ) : r.resolved_at ? (
              <p className="text-xs text-muted-foreground sm:pl-[3.25rem]">
                Closed {formatDate(r.resolved_at)}
              </p>
            ) : null}
          </li>
        );
      })}
    </AdminListShell>
  );
}
