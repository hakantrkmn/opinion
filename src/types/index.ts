/* eslint-disable @typescript-eslint/no-explicit-any */
// Database Types
export * from "./mapTypes";
export * from "./userTypes";
export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
  crs?: {
    type: "name";
    properties: { name: string };
  };
}

// Pin interface'ini güncelle
export interface Pin {
  id: string;
  user_id: string;
  name: string;
  location: GeoJSONPoint; // ✅ Doğru tip
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url?: string;
  };
  users?:
    | {
        display_name: string;
        avatar_url?: string;
      }
    | Array<{
        display_name: string;
        avatar_url?: string;
      }>;
  profiles?: {
    display_name: string;
    avatar_url?: string;
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
  photo_url?: string; // URL to photo in Supabase Storage
  photo_metadata?: {
    file_size?: number;
    width?: number;
    height?: number;
    format?: string;
    upload_date?: string;
  };
  users?:
    | {
        display_name: string;
        avatar_url?: string;
      }
    | Array<{
        display_name: string;
        avatar_url?: string;
      }>;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
  // Yeni alanlar
  is_editing?: boolean;
  vote_count?: number;
  user_vote?: number; // -1: dislike, 0: no vote, 1: like
  // Supabase JOIN'dan gelen vote verileri
  comment_votes?: Array<{
    value: number;
    user_id?: string;
  }>;
}

// Enhanced Comment interface for optimistic updates
export interface EnhancedComment extends Comment {
  // Optimistic update fields
  isOptimistic?: boolean;
  tempId?: string;

  // Calculated fields
  netScore: number;
  likeCount: number;
  dislikeCount: number;

  // UI state
  isVoting?: boolean;
  voteError?: string;
}

export interface CommentVote {
  id: string;
  comment_id: string;
  user_id: string;
  value: number; // -1 veya 1
  created_at: string;
}

export interface VoteData {
  commentId: string;
  likeCount: number;
  dislikeCount: number;
  userVote: number;
  netScore: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

// Component Props
export interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePin: (data: {
    pinName: string;
    comment: string;
    photo?: File;
    photoMetadata?: {
      file_size: number;
      width?: number;
      height?: number;
      format: string;
    };
  }) => void;
}

export interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  comments: Comment[];
  onAddComment: (text: string) => Promise<boolean>;
  loading?: boolean;
}

export interface CommentActionsProps {
  comment: Comment;
  currentUserId: string;
  onEdit: (commentId: string, newText: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  onVote: (commentId: string, value: number) => Promise<boolean>;
}

// Database Operations
export interface CreatePinData {
  pinName: string; // Bu eksikti!
  comment: string;
  lat: number;
  lng: number;
  photo?: File;
  photoMetadata?: {
    file_size: number;
    width?: number;
    height?: number;
    format: string;
  };
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

export interface CommentDeleteResult {
  success: boolean;
  pinDeleted: boolean;
  error: string | null;
  pinId?: string;
}

// Photo Upload Types
export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    file_size: number;
    width: number;
    height: number;
    format: string;
  };
}

export interface PhotoCompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: "webp" | "jpeg";
}

export interface CameraCapture {
  file: File;
  preview: string;
  compressed?: File;
}

// Comment with photo creation
export interface CreateCommentData {
  text: string;
  pinId: string;
  photo?: File;
  photoUrl?: string;
  photoMetadata?: {
    file_size: number;
    width: number;
    height: number;
    format: string;
  };
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
