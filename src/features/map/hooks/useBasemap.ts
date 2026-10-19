"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { BASEMAPS, resolveBasemap, type Basemap } from "../lib/basemaps";
import type { MapLayerManager } from "../lib/layer-manager";
import { sanitizeStyle } from "../lib/style-sanitize";
import { useMapUiStore } from "../store/ui-store";

/** The concrete basemap to show: the user's choice, or the app theme for "auto". */
export function useResolvedBasemap(): Basemap {
  const choice = useMapUiStore((s) => s.basemap);
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme ??
    (typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light");
  return resolveBasemap(choice, theme);
}

/** Switches the map style when the resolved basemap changes. */
export function useBasemapSync(
  map: MapLibreMap | null,
  manager: MapLayerManager | null,
  basemap: Basemap
) {
  const appliedRef = useRef<Basemap>(basemap);

  useEffect(() => {
    if (!map || !manager || appliedRef.current === basemap) return;
    appliedRef.current = basemap;
    manager.setContext({ dark: BASEMAPS[basemap].dark });
    // diff:false → full reload → `style.load` → manager reinstalls our layers
    map.setStyle(BASEMAPS[basemap].url, { diff: false, transformStyle: sanitizeStyle });
  }, [map, manager, basemap]);
}
