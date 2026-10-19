import { toFix, type GeoFix, type GeoPermission } from "../store/location-store";

export const isGeolocationSupported = () =>
  typeof navigator !== "undefined" && "geolocation" in navigator;

/** Reads the permission without prompting (null when the API is missing). */
export async function queryGeoPermission(): Promise<GeoPermission> {
  if (!isGeolocationSupported()) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

export class GeoError extends Error {
  constructor(
    message: string,
    public kind: "denied" | "unavailable" | "timeout" | "unsupported"
  ) {
    super(message);
    this.name = "GeoError";
  }
}

export function toGeoError(error: GeolocationPositionError): GeoError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeoError(
        "Location access is blocked. Allow it in your browser settings to drop a pin.",
        "denied"
      );
    case error.TIMEOUT:
      return new GeoError(
        "Getting your location took too long. Move to an open area and try again.",
        "timeout"
      );
    default:
      return new GeoError(
        "Your location is unavailable right now. Check that location services are on.",
        "unavailable"
      );
  }
}

/** Stop waiting as soon as a fix is at least this precise. */
const GOOD_ACCURACY_M = 50;
/** After this long, settle for the best fix received so far. */
const SETTLE_AFTER_MS = 3_000;

/**
 * A current position, fast. Desktop browsers have no GPS: a high-accuracy,
 * uncached request makes the OS run a fresh Wi-Fi scan that can take 10–20 s.
 * So we ask twice in parallel — a quick (network/cached, ≤ maxAgeMs old)
 * fix and a high-accuracy watch — resolve immediately once one is within
 * GOOD_ACCURACY_M, otherwise take the best one after SETTLE_AFTER_MS.
 */
export function getQuickFix({
  maxAgeMs = 30_000,
  timeoutMs = 15_000,
}: { maxAgeMs?: number; timeoutMs?: number } = {}): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeoError("Your browser does not support location.", "unsupported"));
      return;
    }
    const geo = navigator.geolocation;
    let best: GeoFix | null = null;
    let lastError: GeolocationPositionError | null = null;
    let pending = 2;
    let done = false;

    const finish = (result: GeoFix | GeoError) => {
      if (done) return;
      done = true;
      geo.clearWatch(watchId);
      clearTimeout(settleTimer);
      clearTimeout(hardTimer);
      if (result instanceof GeoError) reject(result);
      else resolve(result);
    };
    const onPosition = (position: GeolocationPosition) => {
      const fix = toFix(position);
      if (!best || fix.accuracy < best.accuracy) best = fix;
      if (best.accuracy <= GOOD_ACCURACY_M) finish(best);
    };
    const onError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) return finish(toGeoError(error));
      lastError = error;
      if (--pending === 0 && !best) finish(toGeoError(error));
    };

    const watchId = geo.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: maxAgeMs,
      timeout: timeoutMs,
    });
    geo.getCurrentPosition(onPosition, onError, {
      enableHighAccuracy: false,
      maximumAge: Math.max(maxAgeMs, 60_000),
      timeout: timeoutMs,
    });

    const settleTimer = setTimeout(() => {
      if (best) finish(best);
    }, SETTLE_AFTER_MS);
    const hardTimer = setTimeout(() => {
      if (best) finish(best);
      else if (lastError) finish(toGeoError(lastError));
      else
        finish(
          new GeoError(
            "Getting your location took too long. Move to an open area and try again.",
            "timeout"
          )
        );
    }, timeoutMs + 500);
  });
}

/** Options for the continuous "you are here" dot while the map is open. */
export const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 30_000,
};
