import type {
  Comment,
  EnhancedComment,
  LocationPermissionState,
} from "@/types";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./useSession";
import { useUserProfile } from "./useUserProfile";

export const useMapState = (initialCoordinates?: [number, number] | null) => {
  // Map refs
  const { session, user: userSession } = useSession();
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

  useEffect(() => {
    if (userSession) {
      const user = {
        id: userSession.id,
        email: userSession.email || "",
      };
      setUser(user);
    }
  }, [userSession]);

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
    getUser: userSession,
  };
};
