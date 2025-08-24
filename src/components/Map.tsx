"use client";

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

  useEffect(() => {
    initializeMap();
  });

  // Yorum ekleme fonksiyonu
  const handleAddCommentCode = async (text: string): Promise<boolean> => {
    // useMap'ten gelen handleAddComment'i kullan
    return await handleAddComment(text);
  };

  // Konum izni reddedildiğinde gösterilecek overlay
  if (locationPermission === "denied") {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Konum İzni Gerekli
          </h2>
          <p className="text-gray-600 mb-6">
            Bu uygulamayı kullanabilmek için konum izninizi vermeniz gerekiyor.
            Lütfen tarayıcı ayarlarından konum iznini açın.
          </p>
          <button
            onClick={getUserLocation}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tekrar Dene
          </button>
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
          <p className="text-gray-600">Konumunuz alınıyor...</p>
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
            <span className="text-sm text-gray-600">Pin'ler yükleniyor...</span>
          </div>
        </div>
      )}

      {/* Harita Stili Değiştirme Butonları */}
      <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => changeMapStyle("light")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentStyle === "light"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title="Açık Tema"
          >
            ☀️
          </button>

          <button
            onClick={() => changeMapStyle("dark")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentStyle === "dark"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title="Koyu Tema"
          >
            🌙
          </button>

          <button
            onClick={() => changeMapStyle("voyager")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentStyle === "voyager"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title="Voyager"
          >
            🗺️
          </button>
        </div>
      </div>

      {/* Konum Butonu */}
      {userLocation && (
        <button
          onClick={goToUserLocation}
          className="fixed bottom-4 right-4 bg-white p-2 rounded-lg shadow hover:bg-gray-50 transition-colors z-50"
          title="Konumuma Git"
        >
          📍
        </button>
      )}

      {/* Pin Oluşturma Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onCreatePin={createPin}
      />

      {/* Pin Detay Modal */}
      {selectedPin && (
        <PinDetailModal
          isOpen={showPinDetailModal}
          onClose={() => {
            setShowPinDetailModal(false);
            setSelectedPin(null);
          }}
          pinName={selectedPin?.pinName || ""}
          comments={selectedPin?.comments || []}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onVoteComment={handleVoteComment}
          currentUserId={user?.id || ""}
          loading={pinsLoading}
        />
      )}

      {/* Pin Marker'ları */}
      {mapPins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          map={map.current} // ✅ map.current kullanın (maplibregl.Map instance'ı)
          onPinClick={handlePinClick}
        />
      ))}

      {/* Refresh butonu */}
      <RefreshButton onRefresh={refreshPins} isRefreshing={isRefreshing} />
    </div>
  );
}
