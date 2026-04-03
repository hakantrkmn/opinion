import { useEffect } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { useMapStore } from "@/store/map-store";
import { useCommentOperations } from "./useCommentOperations";
import { useMapCore } from "./useMapCore";
import { usePinOperations } from "./usePinOperations";

export const useMap = (initialCoordinates?: [number, number] | null) => {
  const mapCore = useMapCore(initialCoordinates);
  const store = useMapStore();

  const pinOps = usePinOperations({ map: mapCore.map });
  const loadPinsFromMapWithCache = pinOps.loadPinsFromMapWithCache;

  const commentOps = useCommentOperations({
    getPinComments: pinOps.getPinComments,
    removePin: pinOps.removePin,
  });

  const longPressBind = useLongPress(pinOps.onLongPress, {
    onCancel: () => {},
    threshold: 500,
    cancelOnMovement: true,
    detect: LongPressEventType.Pointer,
  });

  // Recreate user marker when profile changes
  useEffect(() => {
    if (mapCore.userLocation && mapCore.profile) {
      mapCore.addUserMarker(mapCore.userLocation[0], mapCore.userLocation[1]);
    }
  }, [
    mapCore.profile?.avatar_url,
    mapCore.profile?.display_name,
    mapCore.userLocation,
    mapCore.addUserMarker,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pinOps.loadingTimeoutRef.current) clearTimeout(pinOps.loadingTimeoutRef.current);
      try { mapCore.userMarker.current?.remove(); } catch {}
      try { mapCore.map.current?.remove(); } catch {}
    };
  }, [pinOps.loadingTimeoutRef, mapCore.userMarker, mapCore.map]);

  return {
    // Refs
    mapContainer: mapCore.mapContainer,
    map: mapCore.map,

    // Map state
    currentStyle: mapCore.currentStyle,
    locationPermission: mapCore.locationPermission,
    userLocation: mapCore.userLocation,
    currentZoom: mapCore.currentZoom,
    user: mapCore.user,

    // Store state (Zustand)
    showPinModal: store.showPinModal,
    setShowPinModal: store.setShowPinModal,
    showPinDetailModal: store.showPinDetailModal,
    setShowPinDetailModal: store.setShowPinDetailModal,
    selectedPin: store.selectedPin,
    setSelectedPin: store.setSelectedPin,
    isRefreshing: store.isRefreshing,
    commentsLoading: store.commentsLoading,
    mapPins: pinOps.pins,
    pinsLoading: pinOps.loading,

    // Actions
    getUserLocation: mapCore.getUserLocation,
    changeMapStyle: (styleName: string) =>
      mapCore.changeMapStyle(styleName, loadPinsFromMapWithCache),
    goToUserLocation: mapCore.goToUserLocation,
    initializeMap: () => mapCore.initializeMap(loadPinsFromMapWithCache),
    createPin: pinOps.createPin,
    longPressBind,
    refreshPins: pinOps.refreshPins,
    // Comment operations
    handlePinClick: commentOps.handlePinClick,
    handleAddComment: commentOps.handleAddComment,
    handleEditComment: commentOps.handleEditComment,
    handleDeleteComment: commentOps.handleDeleteComment,
    handleVoteComment: commentOps.handleVoteComment,
    invalidatePinCommentsCache: commentOps.invalidatePinCommentsCache,
    getPinComments: pinOps.getPinComments,

    hasUserCommented: async () => ({ hasCommented: false, commentId: undefined }),
  };
};
