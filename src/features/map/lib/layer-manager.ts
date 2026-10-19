import type { Map as MapLibreMap } from "maplibre-gl";
import {
  EMPTY_FC,
  installMapLayers,
  setSourceData,
  SRC,
  type LayerContext,
  type SourceData,
} from "./layers";

/**
 * Owns droPINion's sources/layers on a map. Keeps the latest data for every
 * source so it can rebuild everything after a basemap switch (`style.load`
 * wipes custom sources, layers, images and feature-state).
 */
export class MapLayerManager {
  private data: SourceData = {
    serverClusters: EMPTY_FC,
    pins: EMPTY_FC,
    user: EMPTY_FC,
    draft: EMPTY_FC,
  };
  private selectedPinId: string | null = null;

  constructor(
    private map: MapLibreMap,
    private ctx: LayerContext
  ) {
    map.on("style.load", this.install);
    // The map is handed out on `style.load` (before tiles/sprites finish),
    // when isStyleLoaded() can still be false although sources and layers
    // can already be added. Try now; if the style really isn't ready, the
    // next `style.load` installs.
    try {
      this.install();
    } catch {
      // style not parsed yet
    }
  }

  /** Applied on the next style load (a basemap switch always triggers one). */
  setContext(ctx: LayerContext) {
    this.ctx = ctx;
  }

  setData(key: keyof SourceData, fc: GeoJSON.FeatureCollection) {
    if (this.data[key] === fc) return;
    this.data[key] = fc;
    setSourceData(this.map, SRC[key], fc);
  }

  setSelectedPin(pinId: string | null) {
    if (pinId === this.selectedPinId) return;
    this.applySelected(this.selectedPinId, false);
    this.selectedPinId = pinId;
    this.applySelected(pinId, true);
  }

  destroy() {
    this.map.off("style.load", this.install);
  }

  private install = () => {
    installMapLayers(this.map, this.ctx, this.data);
    this.applySelected(this.selectedPinId, true);
  };

  private applySelected(pinId: string | null, selected: boolean) {
    if (!pinId || !this.map.getSource(SRC.pins)) return;
    try {
      this.map.setFeatureState({ source: SRC.pins, id: pinId }, { selected });
    } catch {
      // map removed or style mid-reload; reapplied on the next install
    }
  }
}
