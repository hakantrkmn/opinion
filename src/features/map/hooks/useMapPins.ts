"use client";

import { PIN_DETAIL_MIN_ZOOM } from "@/constants/map";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  PinCluster,
  PinScope,
  PinsInBoundsResponse,
  PinSummary,
} from "@/types/api";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPinClusters, fetchPinsInBounds } from "../lib/api";
import {
  bboxKey,
  containsBBox,
  quantizeBBox,
  type BBox,
} from "../lib/geo";
import { EMPTY_FC } from "../lib/layers";

const MOVE_DEBOUNCE_MS = 200;
const MAP_STALE_TIME = 60_000;

export type MapDataMode = "clusters" | "pins";

/** The (quantized, sticky) area the map queries are keyed on. */
interface QueryArea {
  mode: MapDataMode;
  /** floor(zoom) at the time the area was computed. */
  zoom: number;
  bbox: BBox;
  key: string;
}

function viewportOf(map: MapLibreMap) {
  const b = map.getBounds();
  return {
    zoom: map.getZoom(),
    bounds: {
      minLng: b.getWest(),
      minLat: b.getSouth(),
      maxLng: b.getEast(),
      maxLat: b.getNorth(),
    },
  };
}

/**
 * Keeps the previous area while the viewport still fits inside it, so
 * panning/zooming within already-loaded data never refetches. Pins are
 * re-requested on zoom-in only when the last response was truncated.
 */
function nextArea(
  prev: QueryArea | null,
  map: MapLibreMap,
  wasTruncated: (area: QueryArea) => boolean
): QueryArea {
  const { zoom, bounds } = viewportOf(map);
  const mode: MapDataMode = zoom < PIN_DETAIL_MIN_ZOOM ? "clusters" : "pins";
  const z = Math.floor(zoom);

  if (prev && prev.mode === mode && containsBBox(prev.bbox, bounds)) {
    if (mode === "clusters" && prev.zoom === z) return prev;
    if (mode === "pins" && (z <= prev.zoom || !wasTruncated(prev))) return prev;
  }
  const bbox = quantizeBBox(bounds, zoom);
  return { mode, zoom: z, bbox, key: bboxKey(bbox) };
}

function formatCount(count: number) {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(count / 1000)}k`;
}

function clustersToFC(clusters: PinCluster[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: clusters.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: {
        key: c.key,
        count: c.count,
        count_label: formatCount(c.count),
        pin_id: c.pin_id,
      },
    })),
  };
}

function pinsToFC(pins: PinSummary[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name, comments_count: p.comments_count },
    })),
  };
}

/**
 * All map data through TanStack Query: one request per (quantized) viewport,
 * keyed by scope so switching scope always refetches/hits the right cache.
 */
export function useMapPins(map: MapLibreMap | null, scope: PinScope) {
  const queryClient = useQueryClient();
  const [area, setArea] = useState<QueryArea | null>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    if (!map) return;
    const wasTruncated = (a: QueryArea) =>
      queryClient.getQueryData<PinsInBoundsResponse>(
        queryKeys.pins.bbox(scopeRef.current, a.key)
      )?.truncated ?? false;
    const update = () => setArea((prev) => nextArea(prev, map, wasTruncated));

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMoveEnd = () => {
      clearTimeout(timer);
      timer = setTimeout(update, MOVE_DEBOUNCE_MS);
    };
    update();
    map.on("moveend", onMoveEnd);
    return () => {
      clearTimeout(timer);
      map.off("moveend", onMoveEnd);
    };
  }, [map, queryClient]);

  const mode = area?.mode ?? null;

  const clustersQuery = useQuery({
    queryKey: queryKeys.pins.clusters(scope, area?.zoom ?? -1, area?.key ?? ""),
    queryFn: ({ signal }) => fetchPinClusters(area!.bbox, area!.zoom, scope, signal),
    enabled: mode === "clusters",
    placeholderData: keepPreviousData,
    staleTime: MAP_STALE_TIME,
  });

  const pinsQuery = useQuery({
    queryKey: queryKeys.pins.bbox(scope, area?.key ?? ""),
    queryFn: ({ signal }) => fetchPinsInBounds(area!.bbox, scope, signal),
    enabled: mode === "pins",
    placeholderData: keepPreviousData,
    staleTime: MAP_STALE_TIME,
  });

  const clustersReady = !!clustersQuery.data && !clustersQuery.isPlaceholderData;
  const pinsReady = !!pinsQuery.data && !pinsQuery.isPlaceholderData;
  // While switching modes keep showing the old layer until the new data lands.
  const showClusters = mode === "clusters" || (mode === "pins" && !pinsReady);
  const showPins = mode === "pins" || (mode === "clusters" && !clustersReady);

  const clusterData = clustersQuery.data;
  const pinData = pinsQuery.data;
  const clustersFC = useMemo(
    () => (showClusters && clusterData ? clustersToFC(clusterData.clusters) : EMPTY_FC),
    [showClusters, clusterData]
  );
  const pinsFC = useMemo(
    () => (showPins && pinData ? pinsToFC(pinData.pins) : EMPTY_FC),
    [showPins, pinData]
  );

  const active = mode === "pins" ? pinsQuery : clustersQuery;

  return {
    mode,
    clustersFC,
    pinsFC,
    truncated: mode === "pins" && !!pinData?.truncated,
    isFetching: active.isFetching,
    isError: active.isError && !active.isFetching,
    refetch: active.refetch,
  };
}
