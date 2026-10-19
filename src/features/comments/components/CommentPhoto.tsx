"use client";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageOff, X } from "lucide-react";
import { useState } from "react";

/**
 * 4:3 thumbnail (space reserved → no layout shift, lazy, fades in over a
 * pulsing placeholder) that opens the full photo in a lightbox.
 */
export function CommentPhoto({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-60 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
        <ImageOff className="size-5" aria-hidden />
        Photo unavailable
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative block aspect-[4/3] w-full max-w-60 overflow-hidden rounded-xl border border-border/40 bg-muted transition-transform duration-150 ease-out active:scale-[0.98]",
          !loaded && "animate-pulse"
        )}
        aria-label="Open photo"
      >
        <img
          src={url}
          alt=""
          width={240}
          height={180}
          loading="lazy"
          decoding="async"
          ref={(img) => {
            // Cached/SSR images can finish before React attaches onLoad.
            if (img?.complete && img.naturalWidth > 0) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="z-(--z-dialog-nested) w-auto max-w-[calc(100vw-2rem)] gap-0 border-none bg-transparent p-0 shadow-none sm:max-w-[min(56rem,calc(100vw-4rem))]"
          overlayClassName="z-(--z-dialog-nested) bg-black/85"
        >
          <DialogTitle className="sr-only">Comment photo</DialogTitle>
          <img
            src={url}
            alt="Comment photo"
            className="max-h-[85dvh] w-auto rounded-xl object-contain"
            decoding="async"
          />
          <DialogClose
            className="absolute -top-2 right-0 flex size-10 -translate-y-full items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-[background-color,transform] duration-150 ease-out hover:bg-white/25 active:scale-[0.94]"
            aria-label="Close photo"
          >
            <X className="size-5" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
