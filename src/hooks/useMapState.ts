import { createClient } from "@/lib/supabase/client";
import type { Comment, EnhancedComment } from "@/types";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useUserProfile } from "./useUserProfile";
type LocationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "loading"
  | null;

export const useMapState = (initialCoordinates?: [number, number] | null) => {
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);

  // Map state
  const [currentStyle, setCurrentStyle] = useState("voyager");
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  // Pin modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [showPinDetailModal, setShowPinDetailModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState<{
    pinId: string;
    pinName: string;
    comments: (Comment | EnhancedComment)[];
  } | null>(null);

  // Loading states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Batch comments state
  const [batchComments, setBatchComments] = useState<{
    [pinId: string]: EnhancedComment[];
  }>({});

  // Get user profile
  const { profile } = useUserProfile();

  // Get user information
  const getUser = async () => {
    const supabase = createClient();
    const {
      data: { session: sessionData },
    } = await supabase.auth.getSession();
    if (sessionData?.user) {
      setUser({
        id: sessionData.user.id,
        email: sessionData.user.email || "",
      });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return {
    // Refs
    mapContainer,
    map,
    userMarker,

    // Map state
    currentStyle,
    setCurrentStyle,
    currentZoom,
    setCurrentZoom,
    locationPermission,
    setLocationPermission,
    userLocation,
    setUserLocation,
    user,

    // Pin modal state
    showPinModal,
    setShowPinModal,
    tempPin,
    setTempPin,
    showPinDetailModal,
    setShowPinDetailModal,
    selectedPin,
    setSelectedPin,

    // Loading states
    isRefreshing,
    setIsRefreshing,
    commentsLoading,
    setCommentsLoading,

    // Batch comments
    batchComments,
    setBatchComments,

    // Profile
    profile,

    // Actions
    getUser,
  };
};
