import type { MapScope } from "@/hooks/map/use-map-scope";
import { useEffect } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { useMapStore } from "@/store/map-store";
import { useCommentOperations } from "./useCommentOperations";
import { useMapCore } from "./useMapCore";
import { usePinOperations } from "./usePinOperations";

export const useMap = (
  initialCoordinates?: [number, number] | null,
  scope: MapScope = "all"
) => {
  const mapCore = useMapCore(initialCoordinates);
  const store = useMapStore();

  const pinOps = usePinOperations({ map: mapCore.map, scope });
  const {
    createPin,
    getPinComments,
    loadPinsFromMapWithCache,
    loading,
    loadingTimeoutRef,
    onLongPress,
    pins,
    refreshPins,
    removePin,
  } = pinOps;

  const commentOps = useCommentOperations({
    getPinComments,
    removePin,
  });

  const longPressBind = useLongPress(onLongPress, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapCore.profile?.avatar_url,
    mapCore.profile?.display_name,
    mapCore.userLocation,
    mapCore.addUserMarker,
  ]);

  // Cleanup
  useEffect(() => {
    const timeoutRef = loadingTimeoutRef;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try { mapCore.userMarker.current?.remove(); } catch {}
      try { mapCore.map.current?.remove(); } catch {}
    };
  }, [loadingTimeoutRef, mapCore.userMarker, mapCore.map]);

  useEffect(() => {
    if (!mapCore.map.current) return;
    refreshPins();
  }, [mapCore.map, refreshPins, scope]);

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
    mapPins: pins,
    pinsLoading: loading,

    // Actions
    getUserLocation: mapCore.getUserLocation,
    changeMapStyle: (styleName: string) =>
      mapCore.changeMapStyle(styleName, loadPinsFromMapWithCache),
    goToUserLocation: mapCore.goToUserLocation,
    initializeMap: () => mapCore.initializeMap(loadPinsFromMapWithCache),
    createPin,
    longPressBind,
    refreshPins,
    // Comment operations
    handlePinClick: commentOps.handlePinClick,
    handleAddComment: commentOps.handleAddComment,
    handleEditComment: commentOps.handleEditComment,
    handleDeleteComment: commentOps.handleDeleteComment,
    handleVoteComment: commentOps.handleVoteComment,
    invalidatePinCommentsCache: commentOps.invalidatePinCommentsCache,
    getPinComments,

    hasUserCommented: async () => ({ hasCommented: false, commentId: undefined }),
  };
};
