"use client";

import { PIN_CREATE_MAX_DISTANCE_M } from "@/constants/map";
import { useSession } from "@/features/auth/hooks/useSession";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { distanceMeters, type LngLat } from "../lib/geo";
import { getQuickFix } from "../lib/geolocation";
import { startLocationWatch } from "./useLocationWatch";
import { useLocationStore, type GeoFix } from "../store/location-store";
import { useMapUiStore } from "../store/ui-store";

/** A watched fix this recent and precise is reused instead of asking again. */
const REUSABLE_FIX_AGE_MS = 30_000;
const REUSABLE_FIX_ACCURACY_M = 50;
const DROP_ZOOM = 17;

/**
 * "You must be there": pins are created at (or within
 * PIN_CREATE_MAX_DISTANCE_M of) a recent location fix. Logged-out users are asked
 * to sign in before any location prompt.
 */
export function useDropPin(map: MapLibreMap | null) {
  const { user, isLoading } = useSession();
  const setDraft = useMapUiStore((s) => s.setDraft);
  const setSignInPromptOpen = useMapUiStore((s) => s.setSignInPromptOpen);
  const [locating, setLocating] = useState(false);
  const busyRef = useRef(false);

  const requireUser = useCallback(() => {
    if (user) return true;
    if (!isLoading) setSignInPromptOpen(true);
    return false;
  }, [user, isLoading, setSignInPromptOpen]);

  const freshFix = useCallback(async (): Promise<GeoFix | null> => {
    const known = useLocationStore.getState().fix;
    if (
      known &&
      Date.now() - known.timestamp < REUSABLE_FIX_AGE_MS &&
      known.accuracy <= REUSABLE_FIX_ACCURACY_M
    ) {
      return known;
    }
    busyRef.current = true;
    setLocating(true);
    try {
      const fix = await getQuickFix();
      useLocationStore.getState().setFix(fix);
      // Keep the live dot running so the next drop is instant.
      startLocationWatch();
      return fix;
    } catch (error) {
      toast.error("Couldn't get your location", {
        description: error instanceof Error ? error.message : undefined,
      });
      return null;
    } finally {
      busyRef.current = false;
      setLocating(false);
    }
  }, []);

  /** "Drop a pin" button: pin goes exactly where the fresh fix says. */
  const dropAtMyLocation = useCallback(async () => {
    if (!requireUser() || busyRef.current) return;
    const fix = await freshFix();
    if (!fix) return;
    map?.flyTo({
      center: [fix.lng, fix.lat],
      zoom: Math.max(map.getZoom(), DROP_ZOOM),
      duration: 800,
      essential: true,
    });
    setDraft({ lng: fix.lng, lat: fix.lat, fix });
  }, [freshFix, map, requireUser, setDraft]);

  /** Long-press: pin at the pressed point, only if it is near the user. */
  const dropAt = useCallback(
    async (point: LngLat) => {
      if (!requireUser() || busyRef.current) return;
      const fix = await freshFix();
      if (!fix) return;

      if (distanceMeters(point, [fix.lng, fix.lat]) > PIN_CREATE_MAX_DISTANCE_M) {
        toast.error("Too far from you", {
          description: `You can only drop a pin within ${PIN_CREATE_MAX_DISTANCE_M} m of where you are.`,
        });
        return;
      }
      navigator.vibrate?.(12);
      setDraft({ lng: point[0], lat: point[1], fix });
    },
    [freshFix, requireUser, setDraft]
  );

  return { locating, dropAtMyLocation, dropAt };
}
