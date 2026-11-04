"use client";

import { PIN_CREATE_MAX_ACCURACY_SLACK_M, PIN_CREATE_MAX_DISTANCE_M } from "@/constants/map";
import { distanceMeters } from "@/features/map/lib/geo";
import { getFreshFix } from "@/features/map/lib/fresh-fix";
import type { GeoFix } from "@/features/map/store/location-store";
import { formatDistance } from "@/lib/formatters";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/** The device fix fields of a comment create / update body. */
export interface DeviceFixBody {
  user_lat: number;
  user_lng: number;
  accuracy: number;
}

export function toDeviceFixBody(fix: GeoFix): DeviceFixBody {
  return { user_lat: fix.lat, user_lng: fix.lng, accuracy: fix.accuracy };
}

/** Same rule as the server (checkCreateDistance). */
function isNear(pin: { lat: number; lng: number }, fix: GeoFix) {
  const slack = Math.min(Math.max(fix.accuracy, 0), PIN_CREATE_MAX_ACCURACY_SLACK_M);
  const distance = distanceMeters([pin.lng, pin.lat], [fix.lng, fix.lat]);
  return { ok: distance <= PIN_CREATE_MAX_DISTANCE_M + slack, distance };
}

/**
 * "I'm here": one location check against the pin. Resolves to the fix when
 * the user is close enough, otherwise toasts why and resolves to null.
 * The fix is only sent along with the comment; it is never stored.
 */
export function useHereCheck(pin: { lat: number; lng: number } | undefined) {
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (): Promise<GeoFix | null> => {
    if (!pin) return null;
    setChecking(true);
    try {
      const fix = await getFreshFix();
      const near = isNear(pin, fix);
      if (near.ok) return fix;
      toast.error("You're not at this place", {
        description: `You're ${formatDistance(near.distance)} away. "Was here" needs you within ${PIN_CREATE_MAX_DISTANCE_M} m.`,
      });
      return null;
    } catch (error) {
      toast.error("Couldn't get your location", {
        description: error instanceof Error ? error.message : undefined,
      });
      return null;
    } finally {
      setChecking(false);
    }
  }, [pin]);

  return { check, checking };
}
