"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
  MapTouchEvent,
  PointLike,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { LngLat } from "../lib/geo";
import { INTERACTIVE_LAYERS, LAYER, SRC } from "../lib/layers";

const LONG_PRESS_MS = 550;
const LONG_PRESS_TOLERANCE_PX = 10;

interface Handlers {
  onSelectPin: (pinId: string) => void;
  onLongPress: (point: LngLat) => void;
}

/**
 * Click/hover handlers on the GL layers plus long-press (touch or mouse) and
 * right-click on empty map to drop a pin.
 * Layer-bound listeners live on the map (not the style), so they survive
 * basemap switches.
 */
export function useMapInteractions(map: MapLibreMap | null, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!map) return;

    const onPinClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") handlersRef.current.onSelectPin(id);
    };

    const onClientClusterClick = async (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const center = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
      const source = map.getSource(SRC.pins) as GeoJSONSource | undefined;
      let zoom = map.getZoom() + 2;
      try {
        if (source) zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      } catch {
        // fall back to +2
      }
      map.easeTo({ center, zoom: zoom + 0.5, duration: 450 });
    };

    const onServerClusterClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const pinId = feature.properties?.pin_id;
      if (typeof pinId === "string" && pinId) {
        handlersRef.current.onSelectPin(pinId);
        return;
      }
      const center = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
      map.easeTo({ center, zoom: map.getZoom() + 2, duration: 450 });
    };

    const pointer = () => (map.getCanvas().style.cursor = "pointer");
    const unpointer = () => (map.getCanvas().style.cursor = "");

    map.on("click", LAYER.pinIcons, onPinClick);
    map.on("click", LAYER.pinClusterCircle, onClientClusterClick);
    map.on("click", LAYER.serverClusterCircle, onServerClusterClick);
    map.on("click", LAYER.serverSinglePin, onServerClusterClick);
    for (const layer of INTERACTIVE_LAYERS) {
      map.on("mouseenter", layer, pointer);
      map.on("mouseleave", layer, unpointer);
    }

    // --- long-press / right-click on empty map (never on a pin/cluster) ---
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    const cancel = () => {
      clearTimeout(timer);
      start = null;
    };
    const isOnFeature = (point: { x: number; y: number }) => {
      const layers = INTERACTIVE_LAYERS.filter((id) => map.getLayer(id));
      if (!layers.length) return false;
      const box: [PointLike, PointLike] = [
        [point.x - 8, point.y - 8],
        [point.x + 8, point.y + 8],
      ];
      return map.queryRenderedFeatures(box, { layers }).length > 0;
    };
    const drop = (e: MapMouseEvent | MapTouchEvent) => {
      if (isOnFeature(e.point)) return;
      handlersRef.current.onLongPress([e.lngLat.lng, e.lngLat.lat]);
    };
    const begin = (e: MapMouseEvent | MapTouchEvent) => {
      cancel();
      start = { x: e.point.x, y: e.point.y };
      timer = setTimeout(() => {
        start = null;
        drop(e);
      }, LONG_PRESS_MS);
    };
    const moved = (e: MapMouseEvent | MapTouchEvent) =>
      !!start &&
      Math.hypot(e.point.x - start.x, e.point.y - start.y) > LONG_PRESS_TOLERANCE_PX;

    const onTouchStart = (e: MapTouchEvent) => {
      if (e.originalEvent.touches.length !== 1) return cancel();
      begin(e);
    };
    const onTouchMove = (e: MapTouchEvent) => {
      if (e.originalEvent.touches.length !== 1 || moved(e)) cancel();
    };
    const onMouseDown = (e: MapMouseEvent) => {
      if (e.originalEvent.button !== 0) return;
      begin(e);
    };
    const onMouseMove = (e: MapMouseEvent) => {
      if (moved(e)) cancel();
    };
    const onContextMenu = (e: MapMouseEvent) => {
      e.preventDefault();
      cancel();
      drop(e);
    };

    map.on("touchstart", onTouchStart);
    map.on("touchmove", onTouchMove);
    map.on("touchend", cancel);
    map.on("touchcancel", cancel);
    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", cancel);
    map.on("contextmenu", onContextMenu);
    map.on("dragstart", cancel);
    map.on("zoomstart", cancel);

    return () => {
      cancel();
      map.off("click", LAYER.pinIcons, onPinClick);
      map.off("click", LAYER.pinClusterCircle, onClientClusterClick);
      map.off("click", LAYER.serverClusterCircle, onServerClusterClick);
      map.off("click", LAYER.serverSinglePin, onServerClusterClick);
      for (const layer of INTERACTIVE_LAYERS) {
        map.off("mouseenter", layer, pointer);
        map.off("mouseleave", layer, unpointer);
      }
      map.off("touchstart", onTouchStart);
      map.off("touchmove", onTouchMove);
      map.off("touchend", cancel);
      map.off("touchcancel", cancel);
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", cancel);
      map.off("contextmenu", onContextMenu);
      map.off("dragstart", cancel);
      map.off("zoomstart", cancel);
    };
  }, [map]);
}
