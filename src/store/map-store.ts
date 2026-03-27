import type { EnhancedComment, SelectedPin } from "@/types";
import { create } from "zustand";

interface MapStore {
  // Pin selection & modals
  selectedPin: SelectedPin;
  showPinModal: boolean;
  showPinDetailModal: boolean;
  tempPin: [number, number] | null;

  // Loading
  commentsLoading: boolean;
  isRefreshing: boolean;

  // Batch comments cache
  batchComments: { [pinId: string]: EnhancedComment[] };

  // Actions
  setSelectedPin: (
    pin: SelectedPin | ((prev: SelectedPin) => SelectedPin)
  ) => void;
  setShowPinModal: (show: boolean) => void;
  setShowPinDetailModal: (show: boolean) => void;
  setTempPin: (pin: [number, number] | null) => void;
  setCommentsLoading: (loading: boolean) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setBatchComments: (
    updater:
      | { [pinId: string]: EnhancedComment[] }
      | ((prev: { [pinId: string]: EnhancedComment[] }) => {
          [pinId: string]: EnhancedComment[];
        })
  ) => void;
  reset: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPin: null,
  showPinModal: false,
  showPinDetailModal: false,
  tempPin: null,
  commentsLoading: false,
  isRefreshing: false,
  batchComments: {},

  setSelectedPin: (pin) =>
    set((state) => ({
      selectedPin: typeof pin === "function" ? pin(state.selectedPin) : pin,
    })),
  setShowPinModal: (show) => set({ showPinModal: show }),
  setShowPinDetailModal: (show) => set({ showPinDetailModal: show }),
  setTempPin: (pin) => set({ tempPin: pin }),
  setCommentsLoading: (loading) => set({ commentsLoading: loading }),
  setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  setBatchComments: (updater) =>
    set((state) => ({
      batchComments:
        typeof updater === "function" ? updater(state.batchComments) : updater,
    })),
  reset: () =>
    set({
      selectedPin: null,
      showPinModal: false,
      showPinDetailModal: false,
      tempPin: null,
      commentsLoading: false,
      isRefreshing: false,
      batchComments: {},
    }),
}));
