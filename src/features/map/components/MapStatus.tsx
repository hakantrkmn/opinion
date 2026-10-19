"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { mapSurface } from "./control-styles";

interface MapStatusProps {
  fetching: boolean;
  error: boolean;
  truncated: boolean;
  followingHint: "signin" | "empty" | null;
  onRetry: () => void;
  onSignIn: () => void;
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
  onRetry,
  onSignIn,
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
