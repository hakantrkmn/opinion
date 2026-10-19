"use client";

import { cn } from "@/lib/utils";
import { Check, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BASEMAPS, BASEMAP_CHOICES, type BasemapChoice } from "../lib/basemaps";
import { useMapUiStore } from "../store/ui-store";
import { mapControl } from "./control-styles";

const LABELS: Record<BasemapChoice, string> = {
  auto: "Match theme",
  light: BASEMAPS.light.label,
  dark: BASEMAPS.dark.label,
  colorful: BASEMAPS.colorful.label,
};

export function BasemapPicker() {
  const basemap = useMapUiStore((s) => s.basemap);
  const setBasemap = useMapUiStore((s) => s.setBasemap);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(mapControl, open && "border-primary/40 text-primary")}
        aria-label="Map style"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Map style"
      >
        <Layers className="h-4 w-4" />
      </button>
      <div
        role="menu"
        className={cn(
          "absolute right-full top-0 mr-2 w-40 origin-top-right rounded-xl border border-border/50 bg-background/95 p-1 shadow-xl backdrop-blur-md transition-[opacity,transform] duration-150 ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {BASEMAP_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            role="menuitemradio"
            aria-checked={basemap === choice}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setBasemap(choice);
              setOpen(false);
            }}
            className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs font-medium hover:bg-muted/70"
          >
            {LABELS[choice]}
            {basemap === choice ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
