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
      onClick={handleShare}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/50 bg-background/80 text-foreground text-xs font-medium hover:bg-muted/60 hover:border-border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </button>
  );
}
