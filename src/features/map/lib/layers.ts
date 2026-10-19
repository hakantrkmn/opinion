import {
  CLIENT_CLUSTER_MAX_ZOOM,
  PIN_LABEL_MIN_ZOOM,
} from "@/constants/map";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { MAP_FONT_BOLD, MAP_FONT_REGULAR } from "./basemaps";
import { ensurePinImages, PIN_COLORS, pinImageExpression } from "./pin-image";

/* ---------------------------------------------------------------- ids --- */

export const SRC = {
  serverClusters: "dp-server-clusters",
  pins: "dp-pins",
  user: "dp-user-location",
  draft: "dp-draft-pin",
} as const;

export const LAYER = {
  userAccuracyFill: "dp-user-accuracy-fill",
  userAccuracyLine: "dp-user-accuracy-line",
  userReachFill: "dp-user-reach-fill",
  userReachLine: "dp-user-reach-line",
  draftRangeFill: "dp-draft-range-fill",
  draftRangeLine: "dp-draft-range-line",
  serverClusterHalo: "dp-server-cluster-halo",
  serverClusterCircle: "dp-server-cluster-circle",
  serverClusterCount: "dp-server-cluster-count",
  serverSinglePin: "dp-server-single-pin",
  pinClusterHalo: "dp-pin-cluster-halo",
  pinClusterCircle: "dp-pin-cluster-circle",
  pinClusterCount: "dp-pin-cluster-count",
  pinSelectedHalo: "dp-pin-selected-halo",
  pinIcons: "dp-pin-icons",
  pinLabels: "dp-pin-labels",
  userDotHalo: "dp-user-dot-halo",
  userDot: "dp-user-dot",
  draftPin: "dp-draft-pin",
} as const;

/** Layers that represent pins/clusters: clicks on them never create pins. */
export const INTERACTIVE_LAYERS = [
  LAYER.serverClusterCircle,
  LAYER.serverSinglePin,
  LAYER.pinClusterCircle,
  LAYER.pinIcons,
] as const;

export const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/* ------------------------------------------------------------- styling --- */

const ACCENT = PIN_COLORS.active;
/* Cluster fills are one step deeper than the pins so the white counts stay
   legible on light, dark and colorful basemaps (≥3.5:1 with the text halo). */
const CLUSTER = "#059669"; // emerald-600
const CLUSTER_STRONG = "#047857"; // emerald-700
const CLUSTER_HOT = "#d97706"; // amber-600

const notCluster: ExpressionSpecification = ["!", ["has", "point_count"]];

/** Numeric feature property, 0 when missing/null (no "found null" warnings). */
const num = (prop: string): ExpressionSpecification => [
  "coalesce",
  ["get", prop],
  0,
];

export interface LayerContext {
  /** Whether the active basemap is dark (affects label/halo colors). */
  dark: boolean;
}

export interface SourceData {
  serverClusters: GeoJSON.FeatureCollection;
  pins: GeoJSON.FeatureCollection;
  user: GeoJSON.FeatureCollection;
  draft: GeoJSON.FeatureCollection;
}

function layers({ dark }: LayerContext): LayerSpecification[] {
  const labelColor = dark ? "#f5f5f5" : "#171717";
  const labelHalo = dark ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.92)";
  const ringStroke = dark ? "rgba(10,10,10,0.9)" : "rgba(255,255,255,0.95)";
  const countText = "#ffffff";

  const clusterCircle = (
    haloId: string,
    id: string,
    source: string,
    filter: ExpressionSpecification,
    countProp: string,
    color: ExpressionSpecification | string
  ): LayerSpecification[] => [
    {
      id: haloId,
      type: "circle",
      source,
      filter,
      paint: {
        "circle-color": color,
        "circle-opacity": 0.18,
        "circle-radius": [
          "step",
          num(countProp),
          22,
          10,
          26,
          100,
          32,
          1000,
          38,
        ],
      },
    },
    {
      id,
      type: "circle",
      source,
      filter,
      paint: {
        "circle-color": color,
        "circle-radius": [
          "step",
          num(countProp),
          15,
          10,
          18,
          100,
          23,
          1000,
          28,
        ],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": ringStroke,
      },
    },
  ];

  const countLabel = (
    id: string,
    source: string,
    filter: ExpressionSpecification,
    field: ExpressionSpecification
  ): LayerSpecification => ({
    id,
    type: "symbol",
    source,
    filter,
    layout: {
      "text-field": field,
      "text-font": MAP_FONT_BOLD,
      "text-size": 12.5,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": countText,
      "text-halo-color": "rgba(0,0,0,0.25)",
      "text-halo-width": 0.75,
    },
  });

  return [
    // --- user accuracy + draft range (below everything) ------------------
    {
      id: LAYER.userAccuracyFill,
      type: "fill",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "accuracy"],
      paint: { "fill-color": "#3b82f6", "fill-opacity": 0.1 },
    },
    {
      id: LAYER.userAccuracyLine,
      type: "line",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "accuracy"],
      paint: {
        "line-color": "#3b82f6",
        "line-opacity": 0.35,
        "line-width": 1,
      },
    },
    // Where the user may drop a pin (PIN_CREATE_MAX_DISTANCE_M around them).
    {
      id: LAYER.userReachFill,
      type: "fill",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "reach"],
      paint: { "fill-color": ACCENT, "fill-opacity": 0.05 },
    },
    {
      id: LAYER.userReachLine,
      type: "line",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "reach"],
      paint: {
        "line-color": ACCENT,
        "line-opacity": 0.7,
        "line-width": 1.5,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: LAYER.draftRangeFill,
      type: "fill",
      source: SRC.draft,
      filter: ["==", ["get", "kind"], "range"],
      paint: { "fill-color": ACCENT, "fill-opacity": 0.08 },
    },
    {
      id: LAYER.draftRangeLine,
      type: "line",
      source: SRC.draft,
      filter: ["==", ["get", "kind"], "range"],
      paint: {
        "line-color": ACCENT,
        "line-width": 1.5,
        "line-dasharray": [2, 2],
      },
    },

    // --- user location dot (below pins so they stay readable) -------------
    {
      id: LAYER.userDotHalo,
      type: "circle",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "dot"],
      paint: {
        "circle-radius": 14,
        "circle-color": "#3b82f6",
        "circle-opacity": 0.18,
        "circle-blur": 0.4,
      },
    },
    {
      id: LAYER.userDot,
      type: "circle",
      source: SRC.user,
      filter: ["==", ["get", "kind"], "dot"],
      paint: {
        "circle-radius": 6.5,
        "circle-color": "#3b82f6",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    },

    // --- server clusters (zoom < PIN_DETAIL_MIN_ZOOM) ----------------------
    ...clusterCircle(
      LAYER.serverClusterHalo,
      LAYER.serverClusterCircle,
      SRC.serverClusters,
      [">", num("count"), 1],
      "count",
      ["step", num("count"), CLUSTER, 100, CLUSTER_STRONG, 1000, CLUSTER_HOT]
    ),
    countLabel(
      LAYER.serverClusterCount,
      SRC.serverClusters,
      [">", num("count"), 1],
      ["get", "count_label"]
    ),
    {
      id: LAYER.serverSinglePin,
      type: "symbol",
      source: SRC.serverClusters,
      filter: ["==", ["get", "count"], 1],
      layout: {
        "icon-image": "dp-pin-active",
        "icon-anchor": "bottom",
        "icon-offset": [0, 3],
        "icon-size": 0.9,
        "icon-allow-overlap": true,
      },
    },

    // --- client clusters + pins (zoom >= PIN_DETAIL_MIN_ZOOM) --------------
    ...clusterCircle(
      LAYER.pinClusterHalo,
      LAYER.pinClusterCircle,
      SRC.pins,
      ["has", "point_count"],
      "point_count",
      ["step", num("comments_sum"), CLUSTER, 100, CLUSTER_STRONG, 500, CLUSTER_HOT]
    ),
    countLabel(LAYER.pinClusterCount, SRC.pins, ["has", "point_count"], [
      "get",
      "point_count_abbreviated",
    ]),
    {
      id: LAYER.pinSelectedHalo,
      type: "circle",
      source: SRC.pins,
      filter: notCluster,
      paint: {
        "circle-radius": 20,
        "circle-translate": [0, -22],
        "circle-color": ACCENT,
        "circle-stroke-color": ACCENT,
        "circle-stroke-width": 2,
        "circle-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.28,
          0,
        ],
        "circle-stroke-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.9,
          0,
        ],
      },
    },
    {
      id: LAYER.pinIcons,
      type: "symbol",
      source: SRC.pins,
      filter: notCluster,
      layout: {
        "icon-image": pinImageExpression(),
        "icon-anchor": "bottom",
        "icon-offset": [0, 3],
        "icon-size": [
          "step",
          num("comments_count"),
          0.85,
          2,
          0.95,
          11,
          1.1,
        ],
        "icon-allow-overlap": true,
        "symbol-sort-key": num("comments_count"),
      },
    },
    {
      id: LAYER.pinLabels,
      type: "symbol",
      source: SRC.pins,
      filter: notCluster,
      minzoom: PIN_LABEL_MIN_ZOOM,
      layout: {
        "text-field": ["get", "name"],
        "text-font": MAP_FONT_REGULAR,
        "text-size": 12,
        "text-max-width": 9,
        "text-anchor": "top",
        "text-offset": [0, 0.35],
        "text-optional": true,
        "text-padding": 4,
        "symbol-sort-key": ["-", 0, num("comments_count")],
      },
      paint: {
        "text-color": labelColor,
        "text-halo-color": labelHalo,
        "text-halo-width": 1.4,
        "text-halo-blur": 0.4,
      },
    },

    // --- draft pin (on top) -------------------------------------------------
    {
      id: LAYER.draftPin,
      type: "symbol",
      source: SRC.draft,
      filter: ["==", ["get", "kind"], "pin"],
      layout: {
        "icon-image": "dp-pin-active",
        "icon-anchor": "bottom",
        "icon-offset": [0, 3],
        "icon-size": 1.25,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    },
  ];
}

/**
 * (Re-)creates every droPINion source, image and layer on the current style.
 * Idempotent; called on every `style.load` so switching basemaps never loses
 * our layers.
 */
export function installMapLayers(
  map: MapLibreMap,
  ctx: LayerContext,
  data: SourceData
) {
  ensurePinImages(map);

  const addGeoJson = (
    id: string,
    fc: GeoJSON.FeatureCollection,
    extra: Record<string, unknown> = {}
  ) => {
    if (map.getSource(id)) return;
    map.addSource(id, { type: "geojson", data: fc, ...extra });
  };

  addGeoJson(SRC.user, data.user);
  addGeoJson(SRC.draft, data.draft);
  addGeoJson(SRC.serverClusters, data.serverClusters);
  addGeoJson(SRC.pins, data.pins, {
    cluster: true,
    clusterMaxZoom: CLIENT_CLUSTER_MAX_ZOOM,
    clusterRadius: 48,
    clusterProperties: {
      comments_sum: ["+", ["coalesce", ["get", "comments_count"], 0]],
    },
    promoteId: "id",
  });

  for (const layer of layers(ctx)) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
}

/** setData that tolerates the source not existing yet (style still loading). */
export function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
}
