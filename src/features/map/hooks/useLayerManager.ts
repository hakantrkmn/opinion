"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { MapLayerManager } from "../lib/layer-manager";

/** One MapLayerManager per map instance. */
export function useLayerManager(map: MapLibreMap | null, dark: boolean) {
  const [manager, setManager] = useState<MapLayerManager | null>(null);
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    if (!map) return;
    const instance = new MapLayerManager(map, { dark: darkRef.current });
    setManager(instance);
    return () => {
      instance.destroy();
      setManager(null);
    };
  }, [map]);

  return manager;
}
