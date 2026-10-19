// Legacy domain shapes still used by server services and profile pages.
// New web-client code uses the HTTP contract in ./api.ts instead.
export * from "./userTypes";

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

/** @deprecated Use `PinSummary` from "@/types/api". */
export interface Pin {
  id: string;
  user_id: string;
  name: string;
  location: GeoJSONPoint;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url?: string;
  };
  comments_count?: number;
}

/** @deprecated Use `CommentItem` from "@/types/api". */
export interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  text: string;
  is_first_comment: boolean;
  created_at: string;
  photo_url?: string;
  photo_metadata?: {
    file_size?: number;
    width?: number;
    height?: number;
    format?: string;
    upload_date?: string;
  };
  users?:
    | { display_name: string; avatar_url?: string }
    | Array<{ display_name: string; avatar_url?: string }>;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
  pins?: {
    name: string;
  };
  vote_count?: number;
  user_vote?: number;
  comment_votes?: Array<{
    value: number;
    user_id?: string;
  }>;
}

export interface CreatePinData {
  pinName: string;
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
