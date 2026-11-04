"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { NearestPinResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useState } from "react";
import { distanceMeters, type LngLat } from "../lib/geo";

/** Wait this long after the viewport turned out empty (no flicker on pans). */
const SHOW_DELAY_MS = 600;

/** ~1.1 km grid: cache-friendly and never sends the exact viewport. */
const round2 = (v: number) => Math.round(v * 100) / 100;

/** The rounded point is what's sent; `exact` stays on the device. */
function centers(map: MapLibreMap) {
  const c = map.getCenter().wrap();
  return { lat: round2(c.lat), lng: round2(c.lng), exact: [c.lng, c.lat] as LngLat };
}

/**
 * When the loaded viewport has no pins, finds the closest one so the map
 * can say "nothing here yet, nearest is 2.4 km away". `null` while not
 * applicable or loading.
 */
export function useEmptyAreaHint(map: MapLibreMap | null, empty: boolean) {
  const [center, setCenter] = useState<ReturnType<typeof centers> | null>(null);

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
      timer = setTimeout(() => setCenter(centers(map)), SHOW_DELAY_MS);
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

  // Distance from the real view centre, not the ~1 km grid point.
  const data = query.data;
  return useMemo((): NearestPinResponse | null => {
    if (!center || !data) return null;
    if (!data.pin) return data;
    const distance_m = Math.round(distanceMeters(center.exact, [data.pin.lng, data.pin.lat]));
    return { pin: { ...data.pin, distance_m } };
  }, [center, data]);
}
