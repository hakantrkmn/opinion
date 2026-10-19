"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useState, type RefObject } from "react";
import { sanitizeStyle } from "../lib/style-sanitize";
import { writeCachedView, type MapView } from "../lib/view";

interface Options {
  initialView: MapView;
  styleUrl: string;
}

/**
 * Creates the MapLibre map once and returns it after the first `load`.
 * Options are read on mount only; style switches go through `useBasemap`.
 */
export function useMapLibre(
  containerRef: RefObject<HTMLDivElement | null>,
  { initialView, styleUrl }: Options
): MapLibreMap | null {
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = new maplibregl.Map({
      container,
      center: initialView.center,
      zoom: initialView.zoom,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: false,
    });
    // Loaded via setStyle so the basemap passes through `sanitizeStyle`.
    instance.setStyle(styleUrl, { transformStyle: sanitizeStyle });
    // Some basemap POI icons are missing from OpenFreeMap's sprite; draw
    // nothing instead of logging a warning per icon. Our own images (dp-*)
    // are always added before the layers that use them.
    instance.on("styleimagemissing", ({ id }) => {
      if (id.startsWith("dp-") || instance.hasImage(id)) return;
      instance.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();
    // Default (no `compact`) = compact on narrow maps, expanded on desktop.
    instance.addControl(new maplibregl.AttributionControl(), "bottom-left");
    // MapLibre opens the compact attribution until the first drag; start it
    // collapsed on phones so it doesn't cover the floating buttons.
    instance.once("idle", () => {
      container
        .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show")
        ?.classList.remove("maplibregl-compact-show");
    });

    const persistView = () => {
      const c = instance.getCenter();
      writeCachedView({ center: [c.lng, c.lat], zoom: instance.getZoom() });
    };
    instance.on("moveend", persistView);
    // Hand the map out as soon as the style is parsed — not on `load`, which
    // also waits for every initial vector tile and would delay the first pin
    // request by seconds on slow networks.
    instance.once("style.load", () => setMap(instance));

    return () => {
      instance.off("moveend", persistView);
      setMap(null);
      instance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once
  }, []);

  return map;
}
