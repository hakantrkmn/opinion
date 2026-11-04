"use client";

import { usePin } from "@/features/pins/hooks/usePin";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { DEEP_LINK_ZOOM } from "../lib/view";
import { useMapUiStore } from "../store/ui-store";

/**
 * `/?pin=<id>&lat=&lng=` opens that pin's detail. With coordinates the map
 * already starts there; without, it jumps to the pin once it is fetched.
 * Also follows `focusPin()` requests while the map is mounted.
 */
export function useDeepLinkPin(
  map: MapLibreMap | null,
  pinId: string | null,
  hasCoordinates: boolean
) {
  const selectPin = useMapUiStore((s) => s.selectPin);
  const focus = useMapUiStore((s) => s.focus);
  const clearFocus = useMapUiStore((s) => s.clearFocus);
  const { data: pin } = usePin(pinId && !hasCoordinates ? pinId : null);
  const centeredRef = useRef(false);

  useEffect(() => {
    if (pinId) selectPin(pinId);
  }, [pinId, selectPin]);

  useEffect(() => {
    if (!map || !pin || centeredRef.current) return;
    centeredRef.current = true;
    map.jumpTo({
      center: [pin.lng, pin.lat],
      zoom: Math.max(map.getZoom(), DEEP_LINK_ZOOM),
    });
  }, [map, pin]);

  // focusPin() from outside the map (e.g. the notification inbox), also
  // when requested while the map was still loading. Consumed once.
  useEffect(() => {
    if (!map || !focus) return;
    clearFocus();
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: Math.max(map.getZoom(), DEEP_LINK_ZOOM),
    });
  }, [map, focus, clearFocus]);

  // A request the map never consumed must not fire on a later visit.
  useEffect(() => clearFocus, [clearFocus]);
}

/** Drops ?pin/lat/lng from the URL so a reload doesn't reopen the pin. */
export function clearDeepLinkParams() {
  const url = new URL(window.location.href);
  const keys = ["pin", "lat", "lng", "long"];
  if (!keys.some((k) => url.searchParams.has(k))) return;
  for (const k of keys) url.searchParams.delete(k);
  window.history.replaceState(null, "", url);
}
