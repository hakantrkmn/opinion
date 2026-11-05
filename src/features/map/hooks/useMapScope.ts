"use client";

import type { PinScope } from "@/types/api";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/** Whose pins the map shows. `communityId` is set only for "community". */
export interface MapFilter {
  scope: PinScope;
  communityId: string | null;
}

/** Stable cache-key part for a filter. */
export function mapFilterKey(f: MapFilter): string {
  return f.scope === "community" ? `community:${f.communityId}` : f.scope;
}

/**
 * Stored in the URL (?scope=following, ?scope=community&community=<id>).
 * Uses the native History API (synced with useSearchParams by Next) so
 * switching never triggers a server round-trip.
 */
export function useMapScope() {
  const searchParams = useSearchParams();
  const rawScope = searchParams.get("scope");
  const rawCommunity = searchParams.get("community");
  const filter = useMemo<MapFilter>(
    () =>
      rawScope === "following"
        ? { scope: "following", communityId: null }
        : rawScope === "community" && rawCommunity
          ? { scope: "community", communityId: rawCommunity }
          : { scope: "all", communityId: null },
    [rawScope, rawCommunity]
  );

  const setFilter = useCallback((next: MapFilter) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("community");
    if (next.scope === "all") url.searchParams.delete("scope");
    else url.searchParams.set("scope", next.scope);
    if (next.scope === "community" && next.communityId) {
      url.searchParams.set("community", next.communityId);
    }
    window.history.replaceState(null, "", url);
  }, []);

  return { filter, setFilter };
}
