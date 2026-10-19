"use client";

import { PIN_CREATE_MAX_DISTANCE_M } from "@/constants/map";
import { useEffect } from "react";
import { circlePolygon } from "../lib/geo";
import type { MapLayerManager } from "../lib/layer-manager";
import { EMPTY_FC } from "../lib/layers";
import { useLocationStore } from "../store/location-store";
import { useMapUiStore } from "../store/ui-store";

/** Accuracy circles bigger than this are noise (IP-based fixes). */
const MAX_ACCURACY_CIRCLE_M = 2000;

/** Feeds the user-location and draft-pin GL sources. */
export function useMapLayerData(manager: MapLayerManager | null) {
  const fix = useLocationStore((s) => s.fix);
  const draft = useMapUiStore((s) => s.draft);
  const selectedPinId = useMapUiStore((s) => s.selectedPinId);

  const hasDraft = draft !== null;

  useEffect(() => {
    if (!manager) return;
    if (!fix) return manager.setData("user", EMPTY_FC);
    const features: GeoJSON.Feature[] = [
      {
        type: "Feature",
        properties: { kind: "dot" },
        geometry: { type: "Point", coordinates: [fix.lng, fix.lat] },
      },
    ];
    if (fix.accuracy > 15 && fix.accuracy < MAX_ACCURACY_CIRCLE_M) {
      const circle = circlePolygon([fix.lng, fix.lat], fix.accuracy);
      features.unshift({ ...circle, properties: { kind: "accuracy" } });
    }
    // The drop-pin boundary is always visible; while drafting, the draft's
    // own range circle (same center and radius) takes over.
    if (!hasDraft) {
      const reach = circlePolygon([fix.lng, fix.lat], PIN_CREATE_MAX_DISTANCE_M);
      features.unshift({ ...reach, properties: { kind: "reach" } });
    }
    manager.setData("user", { type: "FeatureCollection", features });
  }, [manager, fix, hasDraft]);

  useEffect(() => {
    if (!manager) return;
    if (!draft) return manager.setData("draft", EMPTY_FC);
    const range = circlePolygon([draft.fix.lng, draft.fix.lat], PIN_CREATE_MAX_DISTANCE_M);
    manager.setData("draft", {
      type: "FeatureCollection",
      features: [
        { ...range, properties: { kind: "range" } },
        {
          type: "Feature",
          properties: { kind: "pin" },
          geometry: { type: "Point", coordinates: [draft.lng, draft.lat] },
        },
      ],
    });
  }, [manager, draft]);

  useEffect(() => {
    manager?.setSelectedPin(selectedPinId);
  }, [manager, selectedPinId]);
}
