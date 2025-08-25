"use client";

import { Button } from "@/components/ui/button";
import { useMap } from "@/hooks/useMap";
import { usePins } from "@/hooks/usePins";
import { useEffect } from "react";
import PinDetailModal from "./PinDetailModal";
import PinMarker from "./PinMarker";
import PinModal from "./PinModal";
import { RefreshButton } from "./RefreshButton";

export default function Map() {
  const {
    mapContainer,
    currentStyle,
    locationPermission,
    userLocation,
    mapStyles,
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
    isRefreshing,
  } = useMap();

  const { getPinComments } = usePins();

  //just work once on mount
  useEffect(() => {
    initializeMap();
  }, []);

  // Konum izni reddedildiğinde gösterilecek overlay
  if (locationPermission === "denied") {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Location Permission Required
          </h2>
          <p className="text-gray-600 mb-6">
            To use this application, you need to grant location permission.
            Please enable location access in your browser settings.
          </p>
          <Button onClick={getUserLocation}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Konum yükleniyor
  if (locationPermission === "loading") {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[600px]"
        {...longPressBind()}
      />

      {/* Loading Indicator */}
      {pinsLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">
              Loading pins...
            </span>
          </div>
        </div>
      )}

      {/* Map Style Toggle Buttons */}
      <div className="absolute bottom-20 right-4 bg-background rounded-lg shadow-lg p-1 border">
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

      {/* Location Button */}
      {userLocation && (
        <Button
          onClick={goToUserLocation}
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 shadow-lg"
          title="Go to My Location"
        >
          📍
        </Button>
      )}

      {/* Pin Creation Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onCreatePin={createPin}
      />

      {/* Pin Detail Modal */}
      {selectedPin && (
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
          comments={selectedPin?.comments || []}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onVoteComment={handleVoteComment}
          currentUserId={user?.id || ""}
          loading={pinsLoading}
          onRefresh={async () => {
            // Refresh pin comments
            if (selectedPin) {
              const comments = await getPinComments(selectedPin.pinId);
              if (comments) {
                setSelectedPin((prev) => (prev ? { ...prev, comments } : null));
              }
            }
          }}
        />
      )}

      {/* Pin Markers */}
      {mapPins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          map={map.current} // ✅ map.current kullanın (maplibregl.Map instance'ı)
          onPinClick={handlePinClick}
        />
      ))}

      {/* Refresh button */}
      <RefreshButton onRefresh={refreshPins} isRefreshing={isRefreshing} />
    </div>
  );
}
