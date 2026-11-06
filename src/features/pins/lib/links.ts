import type { PinSummary } from "@/types/api";

/** The map opened on a pin (centred when the coordinates are known). */
export function pinMapHref(pin: { id: string; lat?: number; lng?: number }) {
  const params = new URLSearchParams({ pin: pin.id });
  if (typeof pin.lat === "number" && typeof pin.lng === "number") {
    params.set("lat", pin.lat.toFixed(6));
    params.set("lng", pin.lng.toFixed(6));
  }
  return `/?${params.toString()}`;
}

/**
 * Absolute link to share a pin: its public page, or the map for a
 * community-only pin (which has no page; only members can open it).
 */
export function pinShareUrl(pin: Pick<PinSummary, "id" | "lat" | "lng" | "community">) {
  const path = pin.community ? pinMapHref(pin) : `/pin/${pin.id}`;
  return `${window.location.origin}${path}`;
}
