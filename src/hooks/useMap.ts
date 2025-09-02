import { useEffect } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { useCommentOperations } from "./useCommentOperations";
import { useMapCore } from "./useMapCore";
import { usePinOperations } from "./usePinOperations";

export const useMap = (initialCoordinates?: [number, number] | null) => {
  // Core map state and functionality
  const mapCore = useMapCore(initialCoordinates);
  mapCore.currentStyle = localStorage.getItem("mapStyle") || "voyager";

  // Pin operations
  const pinOps = usePinOperations({
    map: mapCore.map,
    tempPin: mapCore.tempPin,
    setTempPin: mapCore.setTempPin,
    setShowPinModal: mapCore.setShowPinModal,
    setSelectedPin: mapCore.setSelectedPin,
    setShowPinDetailModal: mapCore.setShowPinDetailModal,
    selectedPin: mapCore.selectedPin,
  });

  // Setup loadPinsFromMapWithCache callback for mapCore
  const loadPinsFromMapWithCache = pinOps.loadPinsFromMapWithCache;

  // Comment operations
  const commentOps = useCommentOperations({
    mapPins: pinOps.pins,
    commentsLoading: mapCore.commentsLoading,
    setCommentsLoading: mapCore.setCommentsLoading,
    batchComments: mapCore.batchComments,
    setBatchComments: mapCore.setBatchComments,
    selectedPin: mapCore.selectedPin,
    setSelectedPin: mapCore.setSelectedPin,
    setShowPinDetailModal: mapCore.setShowPinDetailModal,
    getPinComments: pinOps.getPinComments,
    getBatchComments: pinOps.getBatchComments,
  });

  // Long press hook
  const longPressBind = useLongPress(pinOps.onLongPress, {
    onCancel: () => {
      // Action to take when cancelled
    },
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

  // Watch pins state for debugging
  useEffect(() => {
    if (pinOps.pins.length > 0) {
      console.log("Pins loaded:", pinOps.pins.length);
    }
  }, [pinOps.pins]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pinOps.loadingTimeoutRef.current) {
        clearTimeout(pinOps.loadingTimeoutRef.current);
      }
      if (mapCore.userMarker.current) {
        mapCore.userMarker.current.remove();
      }
      if (mapCore.map.current) {
        mapCore.map.current.remove();
      }
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
    mapStyles: {}, // Will be imported in components

    // Pin modal state
    showPinModal: mapCore.showPinModal,
    setShowPinModal: mapCore.setShowPinModal,
    showPinDetailModal: mapCore.showPinDetailModal,
    setShowPinDetailModal: mapCore.setShowPinDetailModal,
    selectedPin: mapCore.selectedPin,
    setSelectedPin: mapCore.setSelectedPin,

    // Loading states
    pinsLoading: pinOps.loading,
    isRefreshing: mapCore.isRefreshing,

    // User
    user: mapCore.user,

    // Pins
    mapPins: pinOps.pins,
    handlePinClick: commentOps.handlePinClick,

    // Actions
    getUserLocation: mapCore.getUserLocation,
    changeMapStyle: (styleName: string) =>
      mapCore.changeMapStyle(styleName, loadPinsFromMapWithCache),
    goToUserLocation: mapCore.goToUserLocation,
    initializeMap: () => mapCore.initializeMap(loadPinsFromMapWithCache),
    createPin: pinOps.createPin,
    longPressBind,
    handleAddComment: commentOps.handleAddComment,
    handleEditComment: commentOps.handleEditComment,
    handleDeleteComment: commentOps.handleDeleteComment,
    handleVoteComment: commentOps.handleVoteComment,
    showPinPopup: pinOps.showPinPopup,
    refreshPins: pinOps.refreshPins,
    invalidatePinCommentsCache: commentOps.invalidatePinCommentsCache,
    getPinComments: pinOps.getPinComments,
    getBatchComments: pinOps.getBatchComments,
    currentZoom: mapCore.currentZoom,
    batchComments: mapCore.batchComments,
    setBatchComments: mapCore.setBatchComments,
    commentsLoading: mapCore.commentsLoading,
    loadVisiblePinsComments: commentOps.loadVisiblePinsComments,
    hasUserCommented: async (pinId: string) => {
      // This functionality is now handled locally in PinDetailModal
      return { hasCommented: false, commentId: undefined };
    },
  };
};
