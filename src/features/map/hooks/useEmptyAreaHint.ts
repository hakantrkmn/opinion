"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { NearestPinResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useState } from "react";

/** Wait this long after the viewport turned out empty (no flicker on pans). */
const SHOW_DELAY_MS = 600;

/** ~1.1 km grid: cache-friendly and never sends the exact viewport. */
const round2 = (v: number) => Math.round(v * 100) / 100;

function roundedCenter(map: MapLibreMap) {
  const c = map.getCenter().wrap();
  return { lat: round2(c.lat), lng: round2(c.lng) };
}

/**
 * When the loaded viewport has no pins, finds the closest one so the map
 * can say "nothing here yet, nearest is 2.4 km away". `null` while not
 * applicable or loading.
 */
export function useEmptyAreaHint(map: MapLibreMap | null, empty: boolean) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !empty) {
      setCenter(null);
      return;
    }
    // Panning inside an already-loaded empty area keeps `empty` true, so
    // follow the map's own move events too.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setCenter(roundedCenter(map)), SHOW_DELAY_MS);
    };
    const hide = () => {
      clearTimeout(timer);
      setCenter(null);
    };
    schedule();
    map.on("movestart", hide);
    map.on("moveend", schedule);
    return () => {
      clearTimeout(timer);
      map.off("movestart", hide);
      map.off("moveend", schedule);
    };
  }, [map, empty]);

  const query = useQuery({
    queryKey: queryKeys.pins.nearest(center?.lat ?? 0, center?.lng ?? 0),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ lat: String(center!.lat), lng: String(center!.lng) });
      return apiClient<NearestPinResponse>(`/api/pins/nearest?${params}`, { signal });
    },
    enabled: !!center,
    staleTime: 5 * 60_000,
  });

  if (!center || !query.data) return null;
  return query.data;
}
