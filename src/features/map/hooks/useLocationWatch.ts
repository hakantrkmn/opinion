"use client";

import { useEffect } from "react";
import {
  isGeolocationSupported,
  queryGeoPermission,
  WATCH_OPTIONS,
} from "../lib/geolocation";
import { toFix, useLocationStore } from "../store/location-store";

let watchId: number | null = null;
/** The user (or a granted permission) asked for live location. */
let wanted = false;

function beginWatch() {
  if (watchId !== null || !isGeolocationSupported()) return;
  if (typeof document !== "undefined" && document.hidden) return;
  const store = useLocationStore.getState();
  if (!store.fix) store.setLocating(true);
  watchId = navigator.geolocation.watchPosition(
    (position) => useLocationStore.getState().setFix(toFix(position)),
    (error) => {
      const s = useLocationStore.getState();
      s.setLocating(false);
      if (error.code === error.PERMISSION_DENIED) {
        s.setPermission("denied");
        stopLocationWatch();
      }
    },
    WATCH_OPTIONS
  );
}

function endWatch() {
  if (watchId === null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** Starts live location (may show the browser permission prompt). */
export function startLocationWatch() {
  if (!isGeolocationSupported()) {
    useLocationStore.getState().setPermission("unsupported");
    return;
  }
  wanted = true;
  beginWatch();
}

export function stopLocationWatch() {
  wanted = false;
  endWatch();
  useLocationStore.getState().setLocating(false);
}

/**
 * Keeps a `watchPosition` running while the map is mounted — but only once
 * permission is granted (never prompts on page load). Pauses while the tab
 * is hidden to save battery.
 */
export function useLocationWatch() {
  useEffect(() => {
    let cancelled = false;
    let status: PermissionStatus | null = null;

    const onPermissionChange = () => {
      if (!status) return;
      useLocationStore.getState().setPermission(status.state);
      if (status.state === "granted") startLocationWatch();
      else if (status.state === "denied") stopLocationWatch();
    };

    void queryGeoPermission().then((permission) => {
      if (cancelled) return;
      useLocationStore.getState().setPermission(permission);
      if (permission === "granted") startLocationWatch();
    });
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        if (cancelled) return;
        status = s;
        s.addEventListener("change", onPermissionChange);
      })
      .catch(() => {});

    const onVisibility = () => {
      if (document.hidden) endWatch();
      else if (wanted) beginWatch();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      status?.removeEventListener("change", onPermissionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      stopLocationWatch();
    };
  }, []);
}
