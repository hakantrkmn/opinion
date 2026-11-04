"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const INTRO_KEY = "dropinion:intro-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true; // storage blocked: don't nag every visit
  }
}

/** Small, dismissible welcome for first-time visitors (map stays usable). */
export function IntroCard() {
  const t = useTranslations("map.intro");
  // Rendered client-only (the map is loaded with ssr:false) → no hydration gap.
  const [visible, setVisible] = useState(() => !readDismissed());
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <section
      aria-label={t("label")}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm rounded-2xl border border-border/60 bg-background/95 p-4 pr-11 shadow-raised backdrop-blur-md",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-300 duration-300 ease-out"
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.94] pointer-coarse:size-10"
        aria-label={t("dismiss")}
      >
        <X className="size-4" />
      </button>
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
          <PinIcon className="size-[18px] text-white" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold leading-tight">{t("title")}</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t.rich("body", {
              b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
