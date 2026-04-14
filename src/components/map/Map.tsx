"use client";

import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants/mapConstants";
import { useMapScope } from "@/hooks/map/use-map-scope";
import { useMap } from "@/hooks/useMap";
import { usePinClustering } from "@/hooks/usePinClustering";

import { useEffect } from "react";
import PinDetailModal from "../pin/PinDetailModal";
import PinModal from "../pin/PinModal";
import { MapControlLayer } from "./controls/MapControlLayer";
import { UserLocationCircle } from "./UserLocationCircle";

interface MapProps {
  initialCoordinates?: [number, number] | null;
}

export default function Map({ initialCoordinates }: MapProps) {
  const { scope, setScope } = useMapScope();
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
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
    user,
    map,
    mapPins,
    handlePinClick,
    refreshPins,
    invalidatePinCommentsCache,
    isRefreshing,
    getPinComments,
    currentZoom,
    commentsLoading,
  } = useMap(initialCoordinates, scope);

  // Clustering: cluster layer + DOM marker hybrid
  usePinClustering(map, mapPins, handlePinClick, currentZoom > 0);

  useEffect(() => {
    initializeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user && scope === "following") {
      setScope("all");
    }
  }, [scope, setScope, user]);

  const isLoading = locationPermission === "loading";
  const controlsHidden = showPinDetailModal || showPinModal;

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="h-full w-full"
        {...longPressBind()}
      />

      <UserLocationCircle
        map={map.current}
        coordinates={userLocation}
        radius={USER_LOCATION_CIRCLE_RADIUS}
        color="#10b981"
        opacity={0.2}
        outlineColor="#10b981"
      />

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

      <MapControlLayer
        hidden={controlsHidden}
        currentStyle={currentStyle}
        onStyleChange={changeMapStyle}
        scope={scope}
        onScopeChange={setScope}
        userLocation={userLocation}
        locationPermission={locationPermission}
        onGetLocation={getUserLocation}
        onGoToLocation={goToUserLocation}
        onRefresh={refreshPins}
        isRefreshing={isRefreshing}
        currentZoom={currentZoom}
      />

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onCreatePin={createPin}
      />

      {selectedPin &&
        (() => {
          const actualPin = mapPins.find((pin) => pin.id === selectedPin.pinId);
          const coordinates = actualPin
            ? {
                lat: actualPin.location.coordinates[1],
                lng: actualPin.location.coordinates[0],
              }
            : undefined;

          return (
            <PinDetailModal
              isOpen={showPinDetailModal}
              onClose={() => {
                setShowPinDetailModal(false);
                setSelectedPin(null);
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

      {/* Pin'ler tamamen MapLibre layer-based - DOM marker yok */}

      <div
        className={`fixed bottom-4 left-4 z-[20] pb-safe transition-opacity duration-200 ${
          controlsHidden ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
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
