"use client";

import type { PinScope } from "@/types/api";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * "all" | "following", stored in the URL (?scope=following). Uses the native
 * History API (synced with useSearchParams by Next) so switching scope never
 * triggers a server round-trip.
 */
export function useMapScope() {
  const searchParams = useSearchParams();
  const scope: PinScope =
    searchParams.get("scope") === "following" ? "following" : "all";

  const setScope = useCallback((next: PinScope) => {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("scope");
    else url.searchParams.set("scope", next);
    window.history.replaceState(null, "", url);
  }, []);

  return { scope, setScope };
}
