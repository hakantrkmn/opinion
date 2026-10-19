"use client";

import dynamic from "next/dynamic";
import type { MapScreenProps } from "./MapScreen";

/** The single client-only boundary for MapLibre (no SSR for WebGL). */
const MapScreen = dynamic(() => import("./MapScreen"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-muted/40" aria-busy="true" aria-label="Loading map" />
  ),
});

export function MapLoader(props: MapScreenProps) {
  return <MapScreen {...props} />;
}
