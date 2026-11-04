"use client";

import { ActionMenu } from "@/features/profile/components/action-menu";
import { Avatar } from "@/components/ui/Avatar";
import {
  useDeleteAvatar,
  useUploadAvatar,
} from "@/features/profile/hooks/use-profile-mutations";
import { cn } from "@/lib/utils";
import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_BYTES = 10 * 1024 * 1024;

const avatarClass = "size-20 text-2xl sm:size-24";

/**
 * Own avatar with change/remove. The picked file is previewed instantly
 * (dimmed + spinner while the server re-encodes it); on failure the old
 * avatar comes back.
 */
export function AvatarUploader({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string;
}) {
  const t = useTranslations("profile.avatar");
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const busy = upload.isPending || remove.isPending;

  const pick = () => inputRef.current?.click();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("notImage"), { description: t("notImageHint") });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("tooLarge"), { description: t("tooLargeHint") });
      return;
    }
    setPreview(URL.createObjectURL(file));
    upload.mutate(file, {
      // Keep the local preview until the processed image is cached, so the
      // avatar never flashes back to initials.
      onSuccess: ({ url }) => {
        const img = new Image();
        img.onload = img.onerror = () => setPreview(null);
        img.src = url;
      },
      onError: () => setPreview(null),
    });
  };

  const badge = (
    <span
      className={cn(
        "absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm transition-transform duration-150 ease-out group-active:scale-95"
      )}
    >
      <Camera aria-hidden className="size-3.5" />
    </span>
  );

  const avatar = (
    <span className="relative block">
      {preview ? (
         
        <img
          src={preview}
          alt=""
          className={cn(avatarClass, "rounded-full object-cover")}
        />
      ) : (
        <Avatar src={src} alt={name} size="xl" fallbackText={name} className={avatarClass} />
      )}
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
          <Loader2 aria-hidden className="size-6 animate-spin" />
        </span>
      ) : null}
    </span>
  );

  const triggerClass =
    "group relative shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span className="sr-only" aria-live="polite">
        {upload.isPending ? t("uploading") : remove.isPending ? t("removing") : ""}
      </span>
      {src && !busy ? (
        <ActionMenu
          label={t("change")}
          align="start"
          triggerClassName={triggerClass}
          trigger={
            <>
              {avatar}
              {badge}
            </>
          }
          items={[
            { label: t("upload"), icon: ImageUp, onSelect: pick },
            {
              label: t("remove"),
              icon: Trash2,
              destructive: true,
              onSelect: () => remove.mutate(),
            },
          ]}
        />
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label={busy ? t("updating") : t("add")}
          className={triggerClass}
        >
          {avatar}
          {!busy ? badge : null}
        </button>
      )}
    </>
  );
}
