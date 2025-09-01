import { generateUserMarkerHTML } from "@/components/UserMarker";
import {
  locationService,
  type LocationPermissionState,
} from "@/services/locationService";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { UserProfile } from "./useUserProfile";

export const useMapLocation = (
  map: React.MutableRefObject<maplibregl.Map | null>,
  userMarker: React.MutableRefObject<maplibregl.Marker | null>,
  setLocationPermission: (state: LocationPermissionState) => void,
  setUserLocation: (location: [number, number] | null) => void,
  userLocation: [number, number] | null,
  profile?: UserProfile
) => {
  // Add user marker
  const addUserMarker = useCallback(
    (lng: number, lat: number) => {
      if (!map.current) return;

      if (userMarker.current) {
        userMarker.current.remove();
      }

      console.log("UserMarker Debug:", {
        avatarUrl: profile?.avatar_url,
        displayName: profile?.display_name,
        hasProfile: !!profile,
        avatarUrlValid: profile?.avatar_url
          ? profile.avatar_url.includes("supabase")
          : false,
      });

      const markerElement = document.createElement("div");
      markerElement.className = "user-marker";
      const generatedHTML = generateUserMarkerHTML(
        profile?.avatar_url,
        profile?.display_name
      );

      console.log(
        "Generated UserMarker HTML:",
        generatedHTML.substring(0, 200) + "..."
      );
      markerElement.innerHTML = generatedHTML;

      userMarker.current = new maplibregl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      console.log("UserMarker added to map at:", [lng, lat]);
    },
    [map, userMarker, profile]
  );

  // Get user location
  const getUserLocation = async () => {
    const result = await locationService.requestLocation(true);

    if (result.success && result.coordinates) {
      toast.success("Location found!", {
        description:
          "You can now use the location button to navigate to your position",
      });
    }
  };

  // Go to user location
  const goToUserLocation = useCallback(() => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: userLocation,
        zoom: 16,
        duration: 1000,
      });
    }
  }, [map, userLocation]);

  // Initialize location service
  useEffect(() => {
    locationService.setCallbacks({
      onLocationUpdate: (coordinates) => {
        setUserLocation(coordinates);
        if (map.current) {
          addUserMarker(coordinates[0], coordinates[1]);
        }
      },
      onPermissionChange: (state) => {
        setLocationPermission(state);
      },
      onError: (error) => {
        console.error("Location service error:", error);
      },
    });

    locationService.initialize();
  }, [setUserLocation, setLocationPermission, map, addUserMarker]);

  return {
    addUserMarker,
    getUserLocation,
    goToUserLocation,
  };
};
