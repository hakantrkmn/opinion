"use client";

import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants/mapConstants";
import { useMap } from "@/hooks/useMap";

import { useEffect } from "react";
import { RefreshButton } from "../common/RefreshButton";
import PinDetailModal from "../pin/PinDetailModal";
import PinMarker from "../pin/PinMarker";
import PinModal from "../pin/PinModal";
import { LocationButton } from "./LocationButton";
import { MapStyleToggle } from "./MapStyleToggle";
import { ThemeToggle } from "./ThemeToggle";
import { UserLocationCircle } from "./UserLocationCircle";

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
    showPinPopup, // Add showPinPopup for popup flow
    refreshPins,
    invalidatePinCommentsCache, // Add cache invalidation
    isRefreshing,
    getPinComments,
    currentZoom,
    // New batch comment features
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

      {/* User Location Circle - 50 metre yarıçap */}
      <UserLocationCircle
        map={map.current}
        coordinates={userLocation}
        radius={USER_LOCATION_CIRCLE_RADIUS}
        color="#3B82F6"
        opacity={0.2}
        outlineColor="#3B82F6"
      />

      {/* Loading Indicators */}
      {(pinsLoading || commentsLoading || isLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border z-60]">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-foreground">
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

      {/* Desktop Controls */}
      <div className="hidden sm:block">
        {/* Map Style Toggle Buttons - Bottom Right */}
        <MapStyleToggle
          currentStyle={currentStyle}
          onStyleChange={changeMapStyle}
          isMobile={false}
        />

        {/* Theme and Location Buttons - Top Right (Fixed positioning like refresh button) */}
        <div className="fixed top-20 right-4 z-30 flex flex-row gap-2">
          <ThemeToggle isMobile={false} />
          <LocationButton
            userLocation={userLocation}
            locationPermission={locationPermission}
            onGetLocation={getUserLocation}
            onGoToLocation={goToUserLocation}
            isMobile={false}
          />
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="sm:hidden">
        {/* Theme and Location Buttons - Top Right (Fixed positioning like refresh button) */}
        <div className="fixed top-20 right-4 z-30 flex flex-row gap-2">
          <ThemeToggle isMobile={true} />
          <LocationButton
            userLocation={userLocation}
            locationPermission={locationPermission}
            onGetLocation={getUserLocation}
            onGoToLocation={goToUserLocation}
            isMobile={true}
          />
        </div>

        {/* Map Style Toggle - Bottom Right with Safari URL bar safe margin */}
        <MapStyleToggle
          currentStyle={currentStyle}
          onStyleChange={changeMapStyle}
          isMobile={true}
        />
      </div>

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

      {/* Buy Me a Coffee Button - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-50">
        <a
          href="https://www.buymeacoffee.com/hakantrkmndev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
            style={{ height: "30px", width: "108px" }}
          />
        </a>
      </div>
    </div>
  );
}
