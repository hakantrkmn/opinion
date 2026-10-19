import { create } from "zustand";

export interface GeoFix {
  lng: number;
  lat: number;
  /** Radius of 68% confidence, meters. */
  accuracy: number;
  timestamp: number;
}

export type GeoPermission =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

interface LocationState {
  fix: GeoFix | null;
  permission: GeoPermission;
  /** True while the user asked for a position and none has arrived yet. */
  locating: boolean;
  setFix: (fix: GeoFix) => void;
  setPermission: (permission: GeoPermission) => void;
  setLocating: (locating: boolean) => void;
}

/** Device location (not server data, not persisted). */
export const useLocationStore = create<LocationState>()((set) => ({
  fix: null,
  permission: "unknown",
  locating: false,
  setFix: (fix) => set({ fix, permission: "granted", locating: false }),
  setPermission: (permission) => set({ permission }),
  setLocating: (locating) => set({ locating }),
}));

export function toFix(position: GeolocationPosition): GeoFix {
  return {
    lng: position.coords.longitude,
    lat: position.coords.latitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
}
