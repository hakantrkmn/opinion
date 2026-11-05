"use client";

import { Button } from "@/components/ui/button";
import { COMMENT_MAX_LENGTH } from "@/constants/limits";
import { PhotoPicker } from "@/features/media/components/PhotoPicker";
import { useObjectUrl } from "@/features/media/hooks/useObjectUrl";
import type { GeoFix } from "@/features/map/store/location-store";
import { cn } from "@/lib/utils";
import { ArrowUp, CheckCircle2, Loader2, LogIn, MapPin, MapPinCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("comments.composer");
  if (!currentUserId) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-2 pl-3 pr-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <LogIn className="size-4 shrink-0" aria-hidden />
          {t("signInPrompt")}
        </span>
        <Button asChild size="sm" className="h-9 shrink-0 rounded-lg px-3.5 text-xs">
          <Link href="/auth">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  if (alreadyCommented) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        {t("alreadyCommented")}
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
  const t = useTranslations("comments.composer");
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
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* One field: text on top, tools underneath (the focus ring wraps both). */}
      <div className="rounded-2xl border border-input bg-background transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
        {previewUrl ? (
          <div className="px-3 pt-3">
            <div className="relative size-16">
              <img src={previewUrl} alt={t("photoAttached")} className="size-16 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm ring-2 ring-background transition-transform duration-150 ease-out active:scale-[0.92] after:absolute after:-inset-2 after:content-['']"
                aria-label={t("removePhoto")}
                disabled={pending}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          rows={1}
          maxLength={COMMENT_MAX_LENGTH}
          disabled={pending}
          enterKeyHint="send"
          className="block max-h-32 min-h-11 w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-base outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:opacity-60 sm:text-sm"
        />
        {hereFix ? (
          <p className="px-3.5 pb-1 text-xs text-emerald-700 dark:text-emerald-400">{t("hereActive")}</p>
        ) : null}
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <PhotoPicker
            onPick={setPhoto}
            disabled={pending || !!photo}
            compact
            className="size-9 rounded-full border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-foreground dark:border-transparent dark:bg-transparent dark:hover:bg-muted pointer-coarse:size-10"
          />
          <button
            type="button"
            onClick={() => void toggleHere()}
            disabled={pending || here.checking || !pin}
            aria-pressed={!!hereFix}
            aria-label={hereFix ? t("hereUndoLabel") : t("hereAddLabel")}
            title={hereFix ? t("hereActive") : t("hereAddLabel")}
            className={cn(
              "flex h-9 select-none items-center gap-1.5 rounded-full px-3 text-xs font-medium touch-manipulation transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 pointer-coarse:h-10",
              hereFix
                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {here.checking ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : hereFix ? (
              <MapPinCheck className="size-4" aria-hidden />
            ) : (
              <MapPin className="size-4" aria-hidden />
            )}
            {hereFix ? t("hereActiveTitle") : t("hereTitle")}
          </button>
          <span className="flex-1" />
          {text.length > COMMENT_MAX_LENGTH * 0.9 ? (
            <span className="px-1 text-xs tabular-nums text-muted-foreground">
              {COMMENT_MAX_LENGTH - text.length}
            </span>
          ) : null}
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0 rounded-full transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.94] disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 pointer-coarse:size-10"
            disabled={!trimmed || pending || here.checking}
            aria-label={t("post")}
            title={t("postTitle")}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
          </Button>
        </div>
      </div>
    </form>
  );
}
