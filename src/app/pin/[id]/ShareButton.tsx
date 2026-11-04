"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  url: string;
  pinName: string;
}

export default function ShareButton({ url, pinName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Phones: the native share sheet (WhatsApp, Instagram…), which shows
    // the quote card preview. Desktop: copy the link.
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: pinName, text: `What do you think about ${pinName}?`, url });
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: show URL in prompt
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-live="polite"
      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-primary" aria-hidden />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </>
      )}
    </button>
  );
}
