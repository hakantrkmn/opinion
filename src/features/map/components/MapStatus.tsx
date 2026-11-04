"use client";

import { formatDistance } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { NearestPinResponse } from "@/types/api";
import { AlertCircle, ArrowRight, Loader2, MapPin, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { mapSurface } from "./control-styles";

interface MapStatusProps {
  fetching: boolean;
  error: boolean;
  truncated: boolean;
  followingHint: "signin" | "empty" | null;
  /** Nothing in view: the closest pin anywhere (or none at all). */
  emptyArea: NearestPinResponse | null;
  onRetry: () => void;
  onSignIn: () => void;
  onShowNearest: (pin: NonNullable<NearestPinResponse["pin"]>) => void;
}

/** Shows only after a short delay so fast (cached) loads never flash. */
function useDelayed(value: boolean, delayMs: number) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!value) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return shown;
}

export function MapStatus({
  fetching,
  error,
  truncated,
  followingHint,
  emptyArea,
  onRetry,
  onSignIn,
  onShowNearest,
}: MapStatusProps) {
  const slow = useDelayed(fetching, 250);

  let content: React.ReactNode = null;
  if (error) {
    content = (
      <>
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        Couldn&apos;t load pins
        <button
          type="button"
          onClick={onRetry}
          className="pointer-events-auto -my-2 ml-0.5 rounded-full px-2 py-2 font-semibold text-primary"
        >
          Retry
        </button>
      </>
    );
  } else if (followingHint === "signin") {
    content = (
      <>
        <button type="button" onClick={onSignIn} className="pointer-events-auto -my-2 -ml-1 rounded-full px-1 py-2 font-semibold text-primary">
          Sign in
        </button>
        to see pins from people you follow
      </>
    );
  } else if (slow) {
    content = (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        Loading pins…
      </>
    );
  } else if (truncated) {
    content = (
      <>
        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        Zoom in to see all pins
      </>
    );
  } else if (followingHint === "empty") {
    content = "No pins from people you follow here";
  } else if (emptyArea) {
    const nearest = emptyArea.pin;
    content = nearest ? (
      <>
        <MapPin className="h-3.5 w-3.5 text-primary" />
        No opinions here yet
        <button
          type="button"
          onClick={() => onShowNearest(nearest)}
          aria-label={`Show the nearest opinion: ${nearest.name}, ${formatDistance(nearest.distance_m)} away`}
          className="pointer-events-auto -my-2 -mr-2 ml-0.5 flex items-center gap-1 rounded-full py-2 pl-2 pr-2.5 font-semibold text-primary"
        >
          <span className="max-w-40 truncate max-sm:hidden">{nearest.name} ·</span>
          {formatDistance(nearest.distance_m)}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </>
    ) : (
      <>
        <MapPin className="h-3.5 w-3.5 text-primary" />
        No opinions yet. Drop the first one!
      </>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-[opacity,transform] duration-200 ease-out",
        mapSurface,
        content ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
      )}
    >
      {content}
    </div>
  );
}
