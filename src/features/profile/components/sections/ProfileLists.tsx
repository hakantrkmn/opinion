"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { plural } from "@/features/profile/lib/format";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PinSummary } from "@/types/api";
import type { UserCommentItem } from "@/types/userTypes";
import {
  AlertCircle,
  ChevronRight,
  Link2,
  Loader2,
  MessageCircle,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

/** Paging/loading state shared by the profile lists. */
export interface ListState {
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

/** Map deep link: the map opens the pin from `pin` and starts at lat/lng. */
export function pinMapHref(pin: { id: string; lat?: number; lng?: number }) {
  const params = new URLSearchParams({ pin: pin.id });
  if (typeof pin.lat === "number" && typeof pin.lng === "number") {
    params.set("lat", pin.lat.toFixed(6));
    params.set("lng", pin.lng.toFixed(6));
  }
  return `/?${params.toString()}`;
}

const rowCard =
  "rounded-2xl border border-border/60 bg-card transition-[background-color,border-color] duration-150 hover:border-border hover:bg-muted/40";
const focusRing =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="max-w-[40ch] text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/40 px-6 py-10 text-center"
    >
      <AlertCircle aria-hidden className="size-5 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">Couldn&apos;t load this list</p>
        <p className="max-w-[40ch] text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" className="h-10 rounded-xl" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * "Load more" that also loads by itself when it scrolls into view
 * (infinite list), while staying a real button for keyboard users.
 */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  error,
  className,
}: Pick<ListState, "hasNextPage" | "isFetchingNextPage" | "fetchNextPage"> & {
  error?: Error | null;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const auto = hasNextPage && !isFetchingNextPage && !error;

  useEffect(() => {
    const el = ref.current;
    if (!el || !auto || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "240px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto, fetchNextPage]);

  if (!hasNextPage) return null;
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn("h-11 w-full rounded-xl text-muted-foreground", className)}
      onClick={() => void fetchNextPage()}
      disabled={isFetchingNextPage}
    >
      {isFetchingNextPage ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Loading…
        </>
      ) : error ? (
        <>
          <RotateCcw aria-hidden />
          Couldn&apos;t load more – try again
        </>
      ) : (
        "Load more"
      )}
    </Button>
  );
}

function ListFrame({
  state,
  count,
  empty,
  skeleton,
  label,
  children,
}: {
  state: ListState;
  count: number;
  empty: ReactNode;
  skeleton: ReactNode;
  label: string;
  children: ReactNode;
}) {
  if (state.isLoading) {
    return (
      <div aria-busy className="flex flex-col gap-2">
        <span className="sr-only">Loading {label}…</span>
        {skeleton}
        {skeleton}
        {skeleton}
      </div>
    );
  }
  if (state.error && count === 0) {
    return <ErrorState message={state.error.message} onRetry={() => void state.refetch()} />;
  }
  if (count === 0) return <>{empty}</>;
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label={label} className="flex flex-col gap-2">
        {children}
      </ul>
      <LoadMore {...state} />
    </div>
  );
}

function PinRowSkeleton() {
  return (
    <div className="flex h-[74px] items-center gap-3 rounded-2xl border border-border/60 px-4">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-2/5 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted/60" />
      </div>
    </div>
  );
}

function CommentRowSkeleton() {
  return (
    <div className="flex h-[86px] flex-col justify-between rounded-2xl border border-border/60 p-4">
      <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
      <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted/60" />
    </div>
  );
}

export function ProfilePinsList({
  pins,
  state,
  onShare,
  empty,
}: {
  pins: PinSummary[];
  state: ListState;
  onShare?: (pin: PinSummary) => void;
  empty: ReactNode;
}) {
  return (
    <ListFrame state={state} count={pins.length} empty={empty} skeleton={<PinRowSkeleton />} label="Pins">
      {pins.map((pin) => (
        <li key={pin.id} className={cn(rowCard, "flex items-center gap-1 pr-2")}>
          <Link
            href={pinMapHref(pin)}
            className={cn(focusRing, "flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3.5 pl-4")}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PinIcon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-semibold text-foreground">{pin.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle aria-hidden className="size-3" />
                <span className="tabular-nums">{plural(pin.comments_count, "comment")}</span>
                <span aria-hidden>·</span>
                <time dateTime={pin.created_at}>{formatTimeAgo(pin.created_at)}</time>
              </span>
            </span>
            {!onShare ? (
              <ChevronRight aria-hidden className="mr-2 size-4 shrink-0 text-muted-foreground/70" />
            ) : null}
          </Link>
          {onShare ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => onShare(pin)}
              aria-label={`Copy link to ${pin.name}`}
            >
              <Link2 aria-hidden />
            </Button>
          ) : null}
        </li>
      ))}
    </ListFrame>
  );
}

export function ProfileCommentsList({
  comments,
  state,
  empty,
}: {
  comments: UserCommentItem[];
  state: ListState;
  empty: ReactNode;
}) {
  return (
    <ListFrame
      state={state}
      count={comments.length}
      empty={empty}
      skeleton={<CommentRowSkeleton />}
      label="Comments"
    >
      {comments.map((comment) => (
        <li key={comment.id}>
          <Link
            href={pinMapHref({ id: comment.pin.id })}
            className={cn(rowCard, focusRing, "flex gap-3 p-4")}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-3">
              <span className="line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                {comment.text}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 font-medium text-foreground/80">
                  <PinIcon className="size-3 shrink-0 text-primary" />
                  <span className="truncate">{comment.pin.name}</span>
                </span>
                <time dateTime={comment.created_at}>{formatTimeAgo(comment.created_at)}</time>
                <span className="inline-flex items-center gap-2.5 tabular-nums">
                  <span className="inline-flex items-center gap-1" aria-label={`${comment.likes} likes`}>
                    <ThumbsUp aria-hidden className="size-3" />
                    {comment.likes}
                  </span>
                  <span className="inline-flex items-center gap-1" aria-label={`${comment.dislikes} dislikes`}>
                    <ThumbsDown aria-hidden className="size-3" />
                    {comment.dislikes}
                  </span>
                </span>
              </span>
            </span>
            {comment.photo_url ? (
               
              <img
                src={comment.photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-xl border border-border/60 object-cover"
              />
            ) : null}
          </Link>
        </li>
      ))}
    </ListFrame>
  );
}
