"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReportContentButton } from "@/features/moderation/components/ReportContentButton";
import { formatTimeAgo } from "@/lib/formatters";
import type { CommentItem, VoteValue } from "@/types/api";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";
import { CommentEditForm } from "./CommentEditForm";
import { CommentPhoto } from "./CommentPhoto";
import { CommentVoting } from "./CommentVoting";

const COLLAPSED_LENGTH = 280;

export interface CommentHandlers {
  onVote: (comment: CommentItem, clicked: 1 | -1) => void;
  onEdit: (
    comment: CommentItem,
    values: { text: string; photo: File | null | undefined }
  ) => Promise<boolean>;
  onDelete: (comment: CommentItem) => void;
}

interface CommentCardProps extends CommentHandlers {
  comment: CommentItem;
  currentUserId: string | null;
  isEditingPending: boolean;
  isDeleting: boolean;
}

function wasEdited(c: CommentItem) {
  return new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 60_000;
}

export const CommentCard = memo(function CommentCard({
  comment,
  currentUserId,
  isEditingPending,
  isDeleting,
  onVote,
  onEdit,
  onDelete,
}: CommentCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isOwn = !!currentUserId && comment.user.id === currentUserId;
  const name = comment.user.display_name ?? "Deleted user";
  const long = comment.text.length > COLLAPSED_LENGTH;
  const text =
    long && !expanded ? `${comment.text.slice(0, COLLAPSED_LENGTH).trimEnd()}…` : comment.text;

  return (
    <article
      className="group rounded-2xl border border-border/50 bg-card p-4 transition-opacity duration-200 data-[deleting=true]:opacity-50"
      data-deleting={isDeleting}
    >
      <header className="mb-2.5 flex items-center justify-between gap-3">
        <Link
          href={`/u/${comment.user.id}`}
          className="-m-1 flex min-w-0 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-muted/50"
        >
          <Avatar src={comment.user.avatar_url} alt={name} size="sm" fallbackText={name} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold leading-tight">{name}</span>
              {comment.is_first_comment ? (
                <span
                  title="Original poster: dropped this pin"
                  className="rounded-md bg-primary/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-primary"
                >
                  OP
                </span>
              ) : null}
            </div>
            <time
              dateTime={comment.created_at}
              className="text-[11px] text-muted-foreground"
              title={new Date(comment.created_at).toLocaleString()}
            >
              {formatTimeAgo(comment.created_at)}
              {wasEdited(comment) ? " · edited" : ""}
            </time>
          </div>
        </Link>

        {!editing ? (
          <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
            {isOwn ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground pointer-coarse:size-10"
                  onClick={() => setEditing(true)}
                  disabled={isDeleting}
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive pointer-coarse:size-10"
                      disabled={isDeleting}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {comment.is_first_comment
                          ? "This is the pin's first comment. If it's the only one left, the pin is removed too."
                          : "This can't be undone."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(comment)}
                        className={buttonVariants({ variant: "destructive" })}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <ReportContentButton
                compact
                ownerId={comment.user.id}
                targetId={comment.id}
                targetType="comment"
              />
            )}
          </div>
        ) : null}
      </header>

      {editing ? (
        <CommentEditForm
          comment={comment}
          pending={isEditingPending}
          onCancel={() => setEditing(false)}
          onSave={async (values) => {
            if (await onEdit(comment, values)) setEditing(false);
          }}
        />
      ) : (
        <>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {text}
          </p>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="-mx-1 mt-1 rounded px-1 py-1 text-xs font-semibold text-primary hover:text-primary/80"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          ) : null}
          {comment.photo_url ? (
            <div className="mt-3">
              <CommentPhoto url={comment.photo_url} />
            </div>
          ) : null}
          <footer className="mt-3 border-t border-border/40 pt-2">
            <CommentVoting
              likes={comment.likes}
              dislikes={comment.dislikes}
              myVote={comment.my_vote as VoteValue}
              onVote={(clicked) => onVote(comment, clicked)}
              disabled={isDeleting}
            />
          </footer>
        </>
      )}
    </article>
  );
});
