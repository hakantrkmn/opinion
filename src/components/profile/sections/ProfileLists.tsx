"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { formatRelativeDateTime } from "@/lib/formatters";
import type { Comment, Pin } from "@/types";
import {
  ChevronRight,
  MessageCircle,
  Share2,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-4 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProfilePinsList({
  pins,
  onShare,
}: {
  pins: Pin[];
  onShare?: (pin: Pin) => void;
}) {
  if (!pins.length) {
    return (
      <EmptyState
        title="No pins yet"
        description="Pins created by this user will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {pins.map((pin) => (
        <Link
          key={pin.id}
          href={`/?lat=${pin.location.coordinates[1].toFixed(6)}&long=${pin.location.coordinates[0].toFixed(6)}`}
          className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/80 p-4 transition-colors hover:bg-muted/40"
        >
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <PinIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {pin.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {pin.comments_count || 0}
              </span>
              <span>{formatRelativeDateTime(pin.created_at)}</span>
            </div>
          </div>
          {onShare ? (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                onShare(pin);
              }}
              aria-label="Share pin"
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : null}
          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
        </Link>
      ))}
    </div>
  );
}

export function ProfileCommentsList({
  comments,
}: {
  comments: Comment[];
}) {
  if (!comments.length) {
    return (
      <EmptyState
        title="No comments yet"
        description="Comments created by this user will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="rounded-2xl border border-border/50 bg-card/80 p-4"
        >
          <p className="text-sm leading-relaxed text-foreground">{comment.text}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <PinIcon className="h-3 w-3" />
                <span className="truncate">{comment.pins?.name || "Unknown"}</span>
              </span>
              <span>{formatRelativeDateTime(comment.created_at)}</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 tabular-nums">
              <ThumbsUp className="h-3 w-3" />
              {comment.vote_count || 0}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
