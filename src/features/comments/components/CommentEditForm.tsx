"use client";

import { Button } from "@/components/ui/button";
import { COMMENT_MAX_LENGTH } from "@/constants/limits";
import { Textarea } from "@/components/ui/textarea";
import { PhotoPicker } from "@/features/media/components/PhotoPicker";
import { useObjectUrl } from "@/features/media/hooks/useObjectUrl";
import type { CommentItem } from "@/types/api";
import { Loader2, Undo2, X } from "lucide-react";
import { useState } from "react";

interface CommentEditFormProps {
  comment: CommentItem;
  pending: boolean;
  /** `photo`: File = replace, null = remove, undefined = keep. */
  onSave: (values: { text: string; photo: File | null | undefined }) => void;
  onCancel: () => void;
}

export function CommentEditForm({
  comment,
  pending,
  onSave,
  onCancel,
}: CommentEditFormProps) {
  const [text, setText] = useState(comment.text);
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const previewUrl = useObjectUrl(photo);

  const shownPhoto = photo ? previewUrl : photo === null ? null : comment.photo_url;
  const trimmed = text.trim();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSave({ text: trimmed, photo });
      }}
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        autoFocus
        aria-label="Edit your comment"
        className="rounded-xl text-base sm:text-sm"
      />

      <div className="flex items-center gap-2">
        {shownPhoto ? (
          <div className="relative">
            <img
              src={shownPhoto}
              alt=""
              className="h-16 w-16 rounded-lg border border-border/40 object-cover"
            />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <PhotoPicker onPick={setPhoto} disabled={pending} compact />
        )}
        {photo !== undefined ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setPhoto(undefined)}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo photo change
          </Button>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="rounded-lg" disabled={pending || !trimmed}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
