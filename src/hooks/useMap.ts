import { EnhancedComment } from "@/types";
import { useCallback, useEffect } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { useMapComments } from "./useMapComments";
import { useMapInteractions } from "./useMapInteractions";
import { useMapLocation } from "./useMapLocation";
import { useMapPins } from "./useMapPins";
import { useMapState } from "./useMapState";
import { usePinsWithHybridCache } from "./usePinsWithHybridCache";

export const useMap = (initialCoordinates?: [number, number] | null) => {
  // State management
  const state = useMapState(initialCoordinates);
  state.currentStyle = localStorage.getItem("mapStyle") || "voyager";
  // Pin operations
  const {
    pins: pinData,
    loading: pinsLoading,
    createPin: createPinInDB,
    getPinComments,
    getBatchComments,
    addComment,
    loadPins: loadPinsFromDB,
    editComment,
    deleteComment,
    voteComment,
    hasUserCommented,
    invalidateCache,
  } = usePinsWithHybridCache();

  const mapPins = pinData;

  // Location management
  const location = useMapLocation(
    state.map,
    state.userMarker,
    state.setLocationPermission,
    state.setUserLocation,
    state.userLocation,
    state.profile || undefined
  );

  // Pin management
  const pinOperations = useMapPins(
    state.map,
    state.tempPin,
    state.setTempPin,
    state.setShowPinModal,
    createPinInDB,
    loadPinsFromDB,
    getPinComments,
    state.setSelectedPin,
    state.setShowPinDetailModal,
    state.selectedPin as {
      pinId: string;
      pinName: string;
      comments: EnhancedComment[];
    } | null
  );

  // Comments management
  const comments = useMapComments(
    mapPins,
    state.commentsLoading,
    state.setCommentsLoading,
    state.batchComments,
    state.setBatchComments,
    getBatchComments,
    getPinComments,
    addComment,
    editComment,
    deleteComment,
    voteComment,
    state.setSelectedPin,
    state.setShowPinDetailModal,
    invalidateCache
  );

  // Map interactions
  const interactions = useMapInteractions(
    state.map,
    state.mapContainer,
    state.setCurrentStyle,
    state.setCurrentZoom,
    state.userLocation,
    location.addUserMarker,
    pinOperations.loadPinsFromMapWithCache,
    initialCoordinates
  );
  // Long press hook
  const longPressBind = useLongPress(pinOperations.onLongPress, {
    onCancel: () => {
      // Action to take when cancelled
    },
    threshold: 500,
    cancelOnMovement: true,
    detect: LongPressEventType.Pointer,
  });

  // Recreate user marker when profile changes
  useEffect(() => {
    if (state.userLocation && state.profile) {
      console.log("Profile changed, updating user marker:", {
        avatarUrl: state.profile.avatar_url,
        displayName: state.profile.display_name,
        userLocation: state.userLocation,
      });
      location.addUserMarker(state.userLocation[0], state.userLocation[1]);
    }
  }, [
    state.profile?.avatar_url,
    state.profile?.display_name,
    state.userLocation,
    location.addUserMarker,
  ]);

  // Watch pins state for debugging
  useEffect(() => {
    if (mapPins.length > 0) {
      console.log("Pins loaded:", mapPins.length);
    }
  }, [mapPins]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pinOperations.loadingTimeoutRef.current) {
        clearTimeout(pinOperations.loadingTimeoutRef.current);
      }
      if (state.userMarker.current) {
        state.userMarker.current.remove();
      }
      if (state.map.current) {
        state.map.current.remove();
      }
    };
  }, [pinOperations.loadingTimeoutRef, state.userMarker, state.map]);

  // Comment handlers that need selectedPin
  const handleAddComment = useCallback(
    async (
      text: string,
      photoUrl?: string,
      photoMetadata?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!state.selectedPin) return false;

      try {
        const success = await addComment(
          state.selectedPin.pinId,
          text,
          photoUrl,
          photoMetadata
        );

        if (success) {
          const updatedComments = await getPinComments(
            state.selectedPin.pinId,
            true
          );
          if (updatedComments) {
            if (updatedComments.length === 0) {
              state.setShowPinDetailModal(false);
              state.setSelectedPin(null);
              return true;
            }

            state.setSelectedPin((prev) =>
              prev ? { ...prev, comments: updatedComments } : null
            );
          }
        }

        return success;
      } catch (error) {
        console.error("Yorum ekleme hatası:", error);
        return false;
      }
    },
    [
      state.selectedPin,
      addComment,
      getPinComments,
      state.setShowPinDetailModal,
      state.setSelectedPin,
    ]
  );

  const handleEditComment = useCallback(
    async (
      commentId: string,
      newText: string,
      photoUrl?: string | null,
      photoMetadata?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!state.selectedPin) return false;

      try {
        const success = await editComment(
          commentId,
          newText,
          photoUrl,
          photoMetadata
        );
        if (success) {
          const updatedComments = await getPinComments(
            state.selectedPin.pinId,
            true
          );
          if (updatedComments) {
            if (updatedComments.length === 0) {
              state.setShowPinDetailModal(false);
              state.setSelectedPin(null);
              return success;
            }

            state.setSelectedPin((prev) =>
              prev ? { ...prev, comments: updatedComments } : null
            );
          }
        }
        return success;
      } catch (error) {
        console.error("Yorum düzenleme hatası:", error);
        return false;
      }
    },
    [
      state.selectedPin,
      editComment,
      getPinComments,
      state.setShowPinDetailModal,
      state.setSelectedPin,
    ]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!state.selectedPin) return false;

      try {
        const success = await deleteComment(commentId);
        console.log("handleDeleteComment success:", success);
        if (success) {
          console.log("Updating selectedPin, removing commentId:", commentId);
          state.setSelectedPin((prev) => {
            if (!prev) return null;
            const filteredComments = prev.comments.filter(
              (comment) => comment.id !== commentId
            );
            if (filteredComments.length === 0) {
              state.setShowPinDetailModal(false);
              state.setSelectedPin(null);
              return null;
            }
            return { ...prev, comments: filteredComments };
          });
        }
        return success;
      } catch (error) {
        console.error("Yorum silme hatası:", error);
        return false;
      }
    },
    [
      state.selectedPin,
      deleteComment,
      state.setShowPinDetailModal,
      state.setSelectedPin,
    ]
  );

  const handleVoteComment = useCallback(
    async (
      commentId: string,
      value: number,
      pinId: string
    ): Promise<boolean> => {
      if (!state.selectedPin) return false;

      try {
        const success = await voteComment(commentId, value, pinId);
        if (success) {
          const updatedComments = await getPinComments(pinId, true);
          if (updatedComments) {
            state.setSelectedPin((prev) =>
              prev ? { ...prev, comments: updatedComments } : null
            );
          }
        }
        return success;
      } catch (error) {
        console.error("Yorum oylama hatası:", error);
        return false;
      }
    },
    [
      state.selectedPin,
      voteComment,
      state.setShowPinDetailModal,
      state.setSelectedPin,
    ]
  );

  return {
    // Refs
    mapContainer: state.mapContainer,
    map: state.map,

    // Map state
    currentStyle: state.currentStyle,
    locationPermission: state.locationPermission,
    userLocation: state.userLocation,
    mapStyles: {}, // Will be imported in components

    // Pin modal state
    showPinModal: state.showPinModal,
    setShowPinModal: state.setShowPinModal,
    showPinDetailModal: state.showPinDetailModal,
    setShowPinDetailModal: state.setShowPinDetailModal,
    selectedPin: state.selectedPin,
    setSelectedPin: state.setSelectedPin,

    // Loading states
    pinsLoading,
    isRefreshing: state.isRefreshing,

    // User
    user: state.user,

    // Pins
    mapPins,
    handlePinClick: comments.handlePinClick,

    // Actions
    getUserLocation: location.getUserLocation,
    changeMapStyle: interactions.changeMapStyle,
    goToUserLocation: location.goToUserLocation,
    initializeMap: interactions.initializeMap,
    createPin: pinOperations.createPin,
    longPressBind,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
    showPinPopup: pinOperations.showPinPopup,
    refreshPins: pinOperations.refreshPins,
    invalidatePinCommentsCache: comments.invalidatePinCommentsCache,
    getPinComments,
    getBatchComments,
    currentZoom: state.currentZoom,
    batchComments: state.batchComments,
    setBatchComments: state.setBatchComments,
    commentsLoading: state.commentsLoading,
    loadVisiblePinsComments: comments.loadVisiblePinsComments,
    hasUserCommented,
  };
};
