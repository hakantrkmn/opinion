"use client";

import { Button } from "@/components/ui/button";
import { useMap } from "@/hooks/useMap";
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
    getPinComments,
    getBatchComments,
    currentZoom,
    // New batch comment features
    batchComments,
    commentsLoading,
    loadVisiblePinsComments,
  } = useMap();

  //just work once on mount
  useEffect(() => {
    initializeMap();
  }, []);

  // Type guard for location permission
  const isLoading = locationPermission === "loading";
  const isDenied = locationPermission === "denied";
  const isPrompt = locationPermission === "prompt";

  // Show iOS prompt overlay when permission is in prompt state
  if (isPrompt) {
    return (
      <div className="relative w-full h-full">
        {/* Map container (blurred background) */}
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[600px] blur-sm opacity-50"
        />

        {/* iOS Permission prompt overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center border-2 border-blue-200">
            <div className="text-blue-500 text-5xl mb-4">📍</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Enable Location Access
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              iOS Safari requires explicit permission for location access.
              <br />
              <strong>Step 1:</strong> Tap the blue button below
              <br />
              <strong>Step 2:</strong> When Safari shows a popup, tap
              &quot;Allow&quot;
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  // iOS'ta localStorage'ı temizle ve konum iste
                  if (
                    typeof window !== "undefined" &&
                    /iPhone|iPad|iPod/i.test(navigator.userAgent)
                  ) {
                    try {
                      localStorage.removeItem("ios-location-permission");
                    } catch (error) {
                      console.log(
                        "Failed to clear iOS permission state:",
                        error
                      );
                    }
                  }
                  getUserLocation();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                📍 Allow Location Access
              </Button>
              <div className="text-xs text-gray-500 space-y-1 mt-4">
                <p className="font-medium text-blue-600">
                  📱 iOS Troubleshooting:
                </p>
                <p>• Make sure you&apos;re not in Private Browsing mode</p>
                <p>• If no popup appears, refresh the page and try again</p>
                <p>• Check Settings → Safari → Location Services → Allow</p>
                <p>• Try closing and reopening Safari</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show overlay when location permission is denied
  if (isDenied) {
    return (
      <div className="relative w-full h-full">
        {/* Map container (blurred background) */}
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[600px] blur-sm opacity-50"
        />

        {/* Permission denied overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <div className="text-red-500 text-5xl mb-4">📍</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Location Access Required
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              We need location permission to use the map. Please enable location
              access in your browser settings.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    // iOS'ta localStorage'ı temizle ve tekrar dene
                    if (
                      typeof window !== "undefined" &&
                      /iPhone|iPad|iPod/i.test(navigator.userAgent)
                    ) {
                      try {
                        localStorage.removeItem("ios-location-permission");
                      } catch (error) {
                        console.log(
                          "Failed to clear iOS permission state:",
                          error
                        );
                      }
                    }
                    getUserLocation();
                  }}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">If the problem persists:</p>
                <p>• Make sure you&apos;re in an open area for GPS signal</p>
                <p>• Check that location services are enabled on your device</p>
                <p>• Refresh your browser</p>
                <p>• If using Safari, try Chrome or Firefox</p>
                <div className="mt-3 p-3 bg-blue-50 rounded text-blue-700 text-left">
                  <p className="font-medium mb-2">📱 On mobile devices:</p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>iPhone/iPad:</strong>
                    </p>
                    <p>• Settings → Privacy → Location Services → On</p>
                    <p>• Settings → Safari → Location → Allow</p>
                    <p className="mt-2">
                      <strong>Android:</strong>
                    </p>
                    <p>• Settings → Location → On</p>
                    <p>• Chrome → Site Settings → Location → Allow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading location
  if (isLoading) {
    return (
      <div className="relative w-full h-full">
        {/* Map container (blurred background) */}
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[600px] blur-sm opacity-30"
        />

        {/* Loading overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Getting your location...</p>
            <p className="text-xs text-gray-500 mt-2">
              This may take a few seconds
            </p>
          </div>
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

      {/* Loading Indicators */}
      {(pinsLoading || commentsLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">
              {pinsLoading && commentsLoading
                ? "Loading pins & comments..."
                : pinsLoading
                ? "Loading pins..."
                : "Loading comments..."}
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
      <Button
        onClick={userLocation ? goToUserLocation : getUserLocation}
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        title={userLocation ? "Go to My Location" : "Get Location"}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : userLocation ? (
          "📍"
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
            // Refresh only pin comments, not all pins
            if (selectedPin) {
              try {
                const comments = await getPinComments(selectedPin.pinId, true); // Force fresh data
                if (comments) {
                  // Check if pin was auto-deleted
                  if (comments.length === 0) {
                    // Pin was auto-deleted, close modal
                    setShowPinDetailModal(false);
                    setSelectedPin(null);
                    return;
                  }

                  setSelectedPin((prev) =>
                    prev ? { ...prev, comments } : null
                  );
                }
                // Note: We don't refresh all pins here, only comments
              } catch (error) {
                console.error("Failed to refresh comments:", error);
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
      <RefreshButton
        onRefresh={refreshPins}
        isRefreshing={isRefreshing}
        currentZoom={currentZoom}
        minZoomLevel={12} // Minimum zoom level 12
      />
    </div>
  );
}
