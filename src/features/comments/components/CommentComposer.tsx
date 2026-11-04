"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/constants/limits";
import { PhotoPicker } from "@/features/media/components/PhotoPicker";
import { useObjectUrl } from "@/features/media/hooks/useObjectUrl";
import type { GeoFix } from "@/features/map/store/location-store";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, LogIn, MapPin, MapPinCheck, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useHereCheck } from "../hooks/use-here-check";
import { useAddComment } from "../hooks/useCommentMutations";

interface CommentComposerProps {
  pinId: string;
  /** Pin location, for the optional "I'm here" check. */
  pin: { lat: number; lng: number } | undefined;
  currentUserId: string | null;
  alreadyCommented: boolean;
}

export function CommentComposer({
  pinId,
  pin,
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

  return <ComposerForm pinId={pinId} pin={pin} />;
}

function ComposerForm({
  pinId,
  pin,
}: {
  pinId: string;
  pin: { lat: number; lng: number } | undefined;
}) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  /** Set once "I'm here" passed; sent with the comment, never stored. */
  const [hereFix, setHereFix] = useState<GeoFix | null>(null);
  const here = useHereCheck(pin);
  const previewUrl = useObjectUrl(photo);
  const addComment = useAddComment(pinId);
  const trimmed = text.trim();
  const pending = addComment.isPending;

  const submit = () => {
    // Wait for a running "I'm here" check, or the badge would be lost.
    if (!trimmed || pending || here.checking) return;
    addComment.mutate(
      { text: trimmed, photo, fix: hereFix },
      {
        onSuccess: () => {
          setText("");
          setPhoto(null);
          setHereFix(null);
        },
      }
    );
  };

  const toggleHere = async () => {
    if (hereFix) return setHereFix(null);
    setHereFix(await here.check());
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
      {hereFix ? (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-primary">
          <MapPinCheck className="size-3.5" aria-hidden />
          You&apos;re here: your opinion gets a “Was here” badge.
        </p>
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
        <Button
          type="button"
          variant={hereFix ? "default" : "outline"}
          size="icon"
          onClick={() => void toggleHere()}
          disabled={pending || here.checking || !pin}
          aria-pressed={!!hereFix}
          aria-label={hereFix ? "You're here (tap to undo)" : "I'm here: add a “Was here” badge"}
          title={hereFix ? "You're here" : "I'm here"}
          className={cn("size-10 shrink-0 rounded-xl", hereFix && "shadow-sm")}
        >
          {here.checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hereFix ? (
            <MapPinCheck className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
        {photo ? null : <PhotoPicker onPick={setPhoto} disabled={pending} compact />}
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-xl transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.94]"
          disabled={!trimmed || pending || here.checking}
          aria-label="Post comment"
          title="Post (⌘/Ctrl + Enter)"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
