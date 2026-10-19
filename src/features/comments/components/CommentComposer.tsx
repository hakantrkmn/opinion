"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/constants/limits";
import { PhotoPicker } from "@/features/media/components/PhotoPicker";
import { useObjectUrl } from "@/features/media/hooks/useObjectUrl";
import { CheckCircle2, Loader2, LogIn, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAddComment } from "../hooks/useCommentMutations";

interface CommentComposerProps {
  pinId: string;
  currentUserId: string | null;
  alreadyCommented: boolean;
}

export function CommentComposer({
  pinId,
  currentUserId,
  alreadyCommented,
}: CommentComposerProps) {
  if (!currentUserId) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-2 pl-3 pr-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <LogIn className="size-4 shrink-0" aria-hidden />
          Sign in to share your droPINion
        </span>
        <Button asChild size="sm" className="h-9 shrink-0 rounded-lg px-3.5 text-xs">
          <Link href="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (alreadyCommented) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        You&apos;ve shared your opinion here — edit or delete it above.
      </p>
    );
  }

  return <ComposerForm pinId={pinId} />;
}

function ComposerForm({ pinId }: { pinId: string }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const previewUrl = useObjectUrl(photo);
  const addComment = useAddComment(pinId);
  const trimmed = text.trim();
  const pending = addComment.isPending;

  const submit = () => {
    if (!trimmed || pending) return;
    addComment.mutate(
      { text: trimmed, photo },
      {
        onSuccess: () => {
          setText("");
          setPhoto(null);
        },
      }
    );
  };

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {previewUrl ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-2">
          <img src={previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <span className="flex-1 text-xs text-muted-foreground">Photo attached</span>
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted pointer-coarse:size-10"
            aria-label="Remove photo"
            disabled={pending}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Share your thoughts…"
          aria-label="Your comment"
          rows={1}
          maxLength={COMMENT_MAX_LENGTH}
          disabled={pending}
          enterKeyHint="send"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl py-2.5 text-base [field-sizing:content] sm:text-sm"
        />
        {photo ? null : <PhotoPicker onPick={setPhoto} disabled={pending} compact />}
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-xl transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.94]"
          disabled={!trimmed || pending}
          aria-label="Post comment"
          title="Post (⌘/Ctrl + Enter)"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
