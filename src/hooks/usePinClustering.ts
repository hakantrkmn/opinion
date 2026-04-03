"use client";

import type { Pin } from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import { generatePinElementHTML } from "@/components/pin/PinElementHTML";

import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";

const SOURCE_ID = "pins-cluster-source";
const CLUSTER_CIRCLE = "cluster-circle";
const CLUSTER_COUNT = "cluster-count";

function pinsToGeoJSON(pins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: pin.location.coordinates,
      },
      properties: {
        id: pin.id,
      },
    })),
  };
}

function cleanupLayers(m: maplibregl.Map) {
  for (const id of [CLUSTER_COUNT, CLUSTER_CIRCLE]) {
    try { if (m.getLayer(id)) m.removeLayer(id); } catch {}
  }
  try { if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID); } catch {}
}

export function usePinClustering(
  map: React.MutableRefObject<maplibregl.Map | null>,
  pins: Pin[],
  onPinClick: (pin: Pin) => void,
  mapReady: boolean
) {
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const listenersAttachedRef = useRef(false);
  // DOM marker tracking: pinId → Marker instance
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const addSourceAndLayers = useCallback((m: maplibregl.Map) => {
    cleanupLayers(m);

    m.addSource(SOURCE_ID, {
      type: "geojson",
      data: pinsToGeoJSON(pinsRef.current),
      cluster: true,
      clusterMaxZoom: 15,
      clusterRadius: 60,
    });

    // Cluster circles
    m.addLayer({
      id: CLUSTER_CIRCLE,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "#10b981", 6, "#10b981", 11, "#f59e0b", 21, "#ef4444",
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          18, 6, 22, 11, 26, 21, 30,
        ],
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
      },
    });

    // Cluster count text
    m.addLayer({
      id: CLUSTER_COUNT,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Noto Sans Regular"],
        "text-size": 13,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#FFFFFF",
      },
    });

    // Cluster click → zoom
    if (!listenersAttachedRef.current) {
      m.on("click", CLUSTER_CIRCLE, async (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: [CLUSTER_CIRCLE] });
        if (!features.length) return;
        const clusterId = Number(features[0].properties?.cluster_id);
        const coords = (features[0].geometry as GeoJSON.Point).coordinates;
        let targetZoom: number;
        try {
          const source = m.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
          targetZoom = await (source as unknown as { getClusterExpansionZoom(id: number): Promise<number> }).getClusterExpansionZoom(clusterId);
        } catch {
          targetZoom = m.getZoom() + 2;
        }
        // +1 ekliyoruz ki cluster tam açılsın ve pin'ler görünsün
        m.easeTo({ center: [coords[0], coords[1]], zoom: targetZoom + 1, duration: 400 });
      });

      m.on("mouseenter", CLUSTER_CIRCLE, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", CLUSTER_CIRCLE, () => { m.getCanvas().style.cursor = ""; });

      listenersAttachedRef.current = true;
    }
  }, [map]);

  /** Unclustered pin'leri DOM marker olarak sync et */
  const syncMarkers = useCallback(() => {
    const m = map.current;
    if (!m) return;

    try {
      if (!m.isStyleLoaded() || !m.getSource(SOURCE_ID)) return;
    } catch { return; }

    // Şu an haritada görünen unclustered feature'ları al
    let features: maplibregl.GeoJSONFeature[];
    try {
      features = m.querySourceFeatures(SOURCE_ID, {
        filter: ["!", ["has", "point_count"]],
      });
    } catch { return; }

    // Görünen pin ID'leri
    const visibleIds = new Set<string>();
    for (const f of features) {
      const id = f.properties?.id;
      if (id) visibleIds.add(id);
    }

    // Artık görünmeyen marker'ları kaldır
    for (const [id, marker] of markersRef.current) {
      if (!visibleIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Yeni görünen pin'ler için marker oluştur
    const pinsMap = new Map(pinsRef.current.map((p) => [p.id, p]));
    const zoom = m.getZoom();

    for (const id of visibleIds) {
      if (markersRef.current.has(id)) continue;
      const pin = pinsMap.get(id);
      if (!pin) continue;

      const [lng, lat] = parseLocation(pin.location);

      const el = document.createElement("div");
      el.className = "pin-marker";
      el.style.cursor = "pointer";
      el.innerHTML = generatePinElementHTML(pin, zoom);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClickRef.current(pin);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(m);

      markersRef.current.set(id, marker);
    }
  }, [map]);

  const updateSource = useCallback(() => {
    const m = map.current;
    if (!m) return;
    try {
      if (!m.isStyleLoaded()) return;
      const source = m.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        (source as maplibregl.GeoJSONSource).setData(pinsToGeoJSON(pinsRef.current));
      } else {
        // Source henüz oluşturulmamış, oluştur
        addSourceAndLayers(m);
      }
    } catch {}
  }, [map, addSourceAndLayers]);

  // Setup cluster layers
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const onStyleLoad = () => {
      // Tüm DOM marker'ları temizle (style change sonrası)
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      addSourceAndLayers(m);
    };

    if (m.isStyleLoaded()) addSourceAndLayers(m);
    m.on("style.load", onStyleLoad);
    return () => { m.off("style.load", onStyleLoad); };
  }, [mapReady, addSourceAndLayers]);

  // DOM marker sync - data/render event'lerinde
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handler = () => syncMarkers();
    m.on("idle", handler);

    return () => {
      m.off("idle", handler);
    };
  }, [mapReady, syncMarkers]);

  // Pin data değişince source güncelle
  useEffect(() => {
    updateSource();
    // Kısa delay sonra marker sync (source update render tetikler ama garanti olsun)
    const t = setTimeout(() => {
      syncMarkers();
    }, 100);
    return () => clearTimeout(t);
  }, [pins, updateSource, syncMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
    };
  }, []);

  return { updateSource };
}
