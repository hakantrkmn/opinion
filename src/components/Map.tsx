"use client";

import { Button } from "@/components/ui/button";
import { useMap } from "@/hooks/useMap";
import { useEffect } from "react";
import PinDetailModal from "./PinDetailModal";
import PinMarker from "./PinMarker";
import PinModal from "./PinModal";
import { RefreshButton } from "./RefreshButton";

interface MapProps {
  initialCoordinates?: [number, number] | null;
}

export default function Map({ initialCoordinates }: MapProps) {
  const {
    mapContainer,
    currentStyle,
    locationPermission,
    userLocation,

    getUserLocation,
    changeMapStyle,
    goToUserLocation,
    initializeMap,
    showPinModal,
    createPin,
    setShowPinModal,
    longPressBind,
    showPinDetailModal,
    setShowPinDetailModal,
    selectedPin,
    setSelectedPin,
    pinsLoading,
    handleAddComment, // usePins'den gelen
    // Yeni fonksiyonları ekleyelim
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
    user, // User'ı ekleyelim
    map,
    mapPins,
    handlePinClick,
    showPinPopup, // Add showPinPopup for popup flow
    refreshPins,
    invalidatePinCommentsCache, // Add cache invalidation
    isRefreshing,
    getPinComments,
    getBatchComments,
    hasUserCommented,
    currentZoom,
    // New batch comment features
    batchComments,
    setBatchComments,
    commentsLoading,
    loadVisiblePinsComments,
  } = useMap(initialCoordinates);

  //just work once on mount
  useEffect(() => {
    initializeMap();
  }, []);

  // Type guard for location permission
  const isLoading = locationPermission === "loading";

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[600px]"
        {...longPressBind()}
      />

      {/* Loading Indicators */}
      {(pinsLoading || commentsLoading || isLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">
              {isLoading
                ? "Getting location..."
                : pinsLoading && commentsLoading
                ? "Loading pins & comments..."
                : pinsLoading
                ? "Loading pins..."
                : "Loading comments..."}
            </span>
          </div>
        </div>
      )}

      {/* Map Style Toggle Buttons - Updated positioning for mobile responsiveness */}
      <div className="absolute bottom-20 sm:bottom-20 right-4 bg-background rounded-lg shadow-lg p-1 border z-40">
        <div className="flex space-x-1">
          <Button
            onClick={() => changeMapStyle("light")}
            variant={currentStyle === "light" ? "default" : "ghost"}
            size="sm"
            title="Light Theme"
          >
            Light
          </Button>

          <Button
            onClick={() => changeMapStyle("dark")}
            variant={currentStyle === "dark" ? "default" : "ghost"}
            size="sm"
            title="Dark Theme"
          >
            Dark
          </Button>

          <Button
            onClick={() => changeMapStyle("voyager")}
            variant={currentStyle === "voyager" ? "default" : "ghost"}
            size="sm"
            title="Voyager"
          >
            Voyager
          </Button>
        </div>
      </div>

      {/* Location Button - Updated with location service integration */}
      <Button
        onClick={userLocation ? goToUserLocation : getUserLocation}
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 shadow-lg h-12 w-12"
        title={
          userLocation
            ? "Go to My Location"
            : locationPermission === "denied"
            ? "Get Location Permission"
            : locationPermission === "loading"
            ? "Getting Location..."
            : "Allow Location Access"
        }
        disabled={locationPermission === "loading"}
      >
        {locationPermission === "loading" ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : userLocation ? (
          "📍"
        ) : locationPermission === "denied" ? (
          "🔒"
        ) : (
          "🎯"
        )}
      </Button>

      {/* Pin Creation Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onCreatePin={createPin}
      />

      {/* Pin Detail Modal */}
      {selectedPin &&
        (() => {
          // Find the actual pin object to get coordinates
          const actualPin = mapPins.find((pin) => pin.id === selectedPin.pinId);
          const coordinates = actualPin
            ? {
                lat: actualPin.location.coordinates[1], // GeoJSON format: [lng, lat]
                lng: actualPin.location.coordinates[0],
              }
            : undefined;

          return (
            <PinDetailModal
              isOpen={showPinDetailModal}
              onClose={() => {
                setShowPinDetailModal(false);
                setSelectedPin(null);
                // Clear map popups when modal is closed
                const existingPopups =
                  document.querySelectorAll(".maplibregl-popup");
                existingPopups.forEach((popup) => popup.remove());
              }}
              pinName={selectedPin?.pinName || ""}
              pinId={selectedPin?.pinId || ""}
              pinCoordinates={coordinates}
              comments={selectedPin?.comments || []}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onVoteComment={handleVoteComment}
              currentUserId={user?.id || ""}
              loading={pinsLoading}
              hasUserCommented={hasUserCommented}
              onRefresh={async () => {
                // Refresh pin comments and update all related caches
                if (selectedPin) {
                  try {
                    const pinId = selectedPin.pinId;

                    // First invalidate caches to ensure fresh data
                    await invalidatePinCommentsCache(pinId);

                    const comments = await getPinComments(
                      selectedPin.pinId,
                      true
                    ); // Force fresh data
                    if (comments) {
                      // Check if pin was auto-deleted
                      if (comments.length === 0) {
                        // Pin was auto-deleted, close modal
                        setShowPinDetailModal(false);
                        setSelectedPin(null);
                        return;
                      }

                      // Update selected pin state
                      setSelectedPin((prev) =>
                        prev ? { ...prev, comments } : null
                      );

                      // Update batch comments cache for this pin with fresh data
                      setBatchComments((prev) => ({
                        ...prev,
                        [selectedPin.pinId]: comments,
                      }));

                      // Force refresh of visible pins comments to ensure cache consistency
                      loadVisiblePinsComments();
                    }
                  } catch (error) {
                    console.error("Failed to refresh comments:", error);
                  }
                }
              }}
            />
          );
        })()}

      {/* Pin Markers */}
      {mapPins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          map={map.current} // ✅ map.current kullanın (maplibregl.Map instance'ı)
          onPinClick={() => showPinPopup(pin)} // Use showPinPopup to restore popup flow
        />
      ))}

      {/* Refresh button */}
      <RefreshButton
        onRefresh={refreshPins}
        isRefreshing={isRefreshing}
        currentZoom={currentZoom}
        minZoomLevel={12} // Minimum zoom level 12
      />
    </div>
  );
}
