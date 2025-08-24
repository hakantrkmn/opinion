/* eslint-disable @typescript-eslint/no-explicit-any */
// Database Types
export interface Pin {
  id: string;
  user_id: string;
  name: string;
  location: string; // PostGIS formatında
  created_at: string;
  user?: {
    display_name: string;
  };
  comments_count?: number;
}

export interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  text: string;
  is_first_comment: boolean;
  created_at: string;
  users?: {
    // user yerine users
    display_name: string;
  };
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

// Component Props
export interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePin: (data: { pinName: string; comment: string }) => void;
}

export interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  comments: Comment[];
  onAddComment: (text: string) => Promise<boolean>;
  loading?: boolean;
}

// Database Operations
export interface CreatePinData {
  pinName: string; // Bu eksikti!
  comment: string;
  lat: number;
  lng: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Hook Return Types
export interface UseMapReturn {
  mapContainer: React.RefObject<HTMLDivElement>;
  currentStyle: string;
  locationPermission: "granted" | "denied" | "loading" | null;
  userLocation: [number, number] | null;
  getUserLocation: () => void;
  changeMapStyle: (styleName: string) => void;
  goToUserLocation: () => void;
  initializeMap: () => void;
  showPinModal: boolean;
  createPin: (data: CreatePinData) => Promise<void>;
  setShowPinModal: (show: boolean) => void;
  longPressBind: any;
  showPinDetailModal: boolean;
  setShowPinDetailModal: (show: boolean) => void;
  selectedPin: {
    pinName: string;
    comments: Comment[];
  } | null;
  setSelectedPin: (pin: any) => void;
}
