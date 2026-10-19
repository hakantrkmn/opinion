"use client";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Person row used by the follower / following / search / blocked lists. */
export function UserRow({
  id,
  name,
  avatarUrl,
  meta,
  action,
  onNavigate,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  meta?: ReactNode;
  /** Trailing control (e.g. Unblock). Without one the row shows a chevron. */
  action?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-2xl transition-colors duration-150 hover:bg-muted/50">
      <Link
        href={`/u/${id}`}
        onClick={onNavigate}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          !action && "pr-3"
        )}
      >
        <Avatar src={avatarUrl} alt="" size="md" fallbackText={name} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          {meta ? <span className="truncate text-xs text-muted-foreground">{meta}</span> : null}
        </span>
        {!action ? <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/70" /> : null}
      </Link>
      {action ? <div className="shrink-0 pr-2">{action}</div> : null}
    </li>
  );
}

export function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3.5 w-2/5 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted/60" />
      </div>
    </div>
  );
}

export function UserListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy className="flex flex-col gap-1">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <UserRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Centered message for empty / error / prompt states inside list dialogs. */
export function ListMessage({
  icon,
  title,
  description,
  action,
  tone = "default",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-8 text-center"
    >
      {icon ? (
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl [&>svg]:size-5",
            tone === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="max-w-[36ch] text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
