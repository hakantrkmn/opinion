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
    handlePinClick,
    refreshPins,
    invalidatePinCommentsCache,
    isRefreshing,
    getPinComments,
    currentZoom,
    commentsLoading,
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
        className="w-full h-full min-h-dvh"
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
      {(pinsLoading || isLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border z-[60]">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-foreground">
              {isLoading ? "Getting location..." : "Loading pins..."}
            </span>
          </div>
        </div>
      )}

      {/* Map Controls - Top Right */}
      <div className="fixed top-20 right-4 z-30 flex flex-col gap-1.5">
        <ThemeToggle isMobile={false} />
        <LocationButton
          userLocation={userLocation}
          locationPermission={locationPermission}
          onGetLocation={getUserLocation}
          onGoToLocation={goToUserLocation}
          isMobile={false}
        />
      </div>

      {/* Map Style Toggle - Bottom Right */}
      <div className="hidden sm:block">
        <MapStyleToggle
          currentStyle={currentStyle}
          onStyleChange={changeMapStyle}
          isMobile={false}
        />
      </div>
      <div className="sm:hidden">
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
              loading={commentsLoading}
              onRefresh={async () => {
                if (selectedPin) {
                  try {
                    // Invalidate comment cache so getPinComments fetches fresh
                    invalidatePinCommentsCache(selectedPin.pinId);

                    const comments = await getPinComments(selectedPin.pinId, true);
                    if (comments) {
                      if (!comments.length) {
                        setShowPinDetailModal(false);
                        setSelectedPin(null);
                        return;
                      }
                      setSelectedPin((prev) =>
                        prev ? { ...prev, comments } : null
                      );
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
          map={map.current}
          onPopupClick={handlePinClick}
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
      <div className="fixed bottom-16 left-4 z-[50] pb-safe">
        <a
          href="https://www.buymeacoffee.com/hakantrkmndev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
            height={30}
            width={108}
            loading="lazy"
            decoding="async"
            style={{ height: "30px", width: "108px" }}
          />
        </a>
      </div>
    </div>
  );
}
