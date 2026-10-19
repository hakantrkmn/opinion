import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BasemapChoice } from "../lib/basemaps";
import type { GeoFix } from "./location-store";

/** A pin being created: where it goes and the GPS fix that justifies it. */
export interface DraftPin {
  lng: number;
  lat: number;
  fix: GeoFix;
}

interface MapUiState {
  selectedPinId: string | null;
  /** Non-null while the "create pin" dialog is open. */
  draft: DraftPin | null;
  signInPromptOpen: boolean;
  basemap: BasemapChoice;

  selectPin: (pinId: string | null) => void;
  setDraft: (draft: DraftPin | null) => void;
  setSignInPromptOpen: (open: boolean) => void;
  setBasemap: (basemap: BasemapChoice) => void;
}

/**
 * UI-only map state. Server data (pins, comments) lives in TanStack Query;
 * device location lives in `useLocationStore`.
 */
export const useMapUiStore = create<MapUiState>()(
  persist(
    (set) => ({
      selectedPinId: null,
      draft: null,
      signInPromptOpen: false,
      basemap: "auto",

      selectPin: (selectedPinId) => set({ selectedPinId }),
      setDraft: (draft) => set({ draft }),
      setSignInPromptOpen: (signInPromptOpen) => set({ signInPromptOpen }),
      setBasemap: (basemap) => set({ basemap }),
    }),
    {
      name: "dropinion:map-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ basemap: state.basemap }),
    }
  )
);
