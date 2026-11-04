"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { GeoError } from "../lib/geolocation";

/**
 * Localized description for a location failure: GeoError by its `kind`,
 * any other Error by its own message.
 */
export function useGeoErrorMessage() {
  const t = useTranslations("map.geoError");
  return useCallback(
    (error: unknown): string | undefined =>
      error instanceof GeoError
        ? t(error.kind)
        : error instanceof Error
          ? error.message
          : undefined,
    [t]
  );
}
