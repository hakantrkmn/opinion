"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface DropPinButtonProps {
  locating: boolean;
  onClick: () => void;
}

export function DropPinButton({ locating, onClick }: DropPinButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      aria-busy={locating}
      className={cn(
        "pointer-events-auto flex h-12 select-none items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-sm font-semibold text-primary-foreground shadow-fab touch-manipulation",
        "transition-[transform,opacity,filter] duration-150 ease-out hover:brightness-110 active:scale-[0.97] disabled:cursor-progress"
      )}
    >
      {locating ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <PinIcon className="size-5 text-white" />
      )}
      <span aria-live="polite">{locating ? "Getting your location…" : "Drop a pin"}</span>
    </button>
  );
}
