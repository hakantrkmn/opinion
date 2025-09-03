import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants/mapConstants";
import { LocationPermissionState } from "@/types";
import {
  checkGeolocationSupport,
  getCurrentLocation,
  getGeolocationPermission,
} from "@/utils/geolocation";
import { toast } from "sonner";
export interface LocationResult {
  success: boolean;
  coordinates?: [number, number]; // [longitude, latitude]
  error?: string;
  permissionState: LocationPermissionState;
}

export interface LocationServiceCallbacks {
  onLocationUpdate: (coordinates: [number, number]) => void;
  onPermissionChange: (state: LocationPermissionState) => void;
  onError: (error: string) => void;
}

export class LocationService {
  private callbacks: LocationServiceCallbacks | null = null;

  constructor(callbacks?: LocationServiceCallbacks) {
    this.callbacks = callbacks || null;
  }

  // Set callbacks for the service
  setCallbacks(callbacks: LocationServiceCallbacks) {
    this.callbacks = callbacks;
  }

  // Get current permission state directly from navigator
  async getPermissionState(): Promise<LocationPermissionState> {
    try {
      const permission = await getGeolocationPermission();
      if (permission === "granted") {
        return "granted";
      } else if (permission === "denied") {
        return "denied";
      } else {
        return "prompt";
      }
    } catch (error) {
      return "unknown";
    }
  }

  // Get current location directly from navigator
  async getCurrentLocation(): Promise<[number, number] | null> {
    try {
      const result = await getCurrentLocation();
      if (result.success && result.position) {
        const { latitude, longitude } = result.position.coords;
        return [longitude, latitude];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Check if location permission is granted
  async hasLocationPermission(): Promise<boolean> {
    const permission = await this.getPermissionState();
    return permission === "granted";
  }

  // Initialize location service and check initial permission state
  async initialize(): Promise<void> {
    // Check geolocation support
    if (!checkGeolocationSupport()) {
      this.callbacks?.onError(
        "Location services not supported by your browser"
      );
      return;
    }

    // Get initial permission state
    const permissionState = await this.getPermissionState();
    this.callbacks?.onPermissionChange(permissionState);

    if (permissionState === "granted") {
      // Permission already granted, get location
      await this.requestLocation(false);
    }
  }

  // Request location permission and get current location
  async requestLocation(showToasts: boolean = true): Promise<LocationResult> {
    // Check geolocation support first
    if (!checkGeolocationSupport()) {
      const error = "Location services not supported";
      if (showToasts) {
        toast.error("Location Error", {
          description: error,
        });
      }
      this.callbacks?.onError(error);
      return {
        success: false,
        error,
        permissionState: "denied",
      };
    }

    try {
      // Get current permission state
      const permissionState = await this.getPermissionState();

      if (permissionState === "denied") {
        const error = "Location permission denied";
        if (showToasts) {
          toast.error("Location Error", {
            description: error,
          });
        }
        this.callbacks?.onError(error);
        return {
          success: false,
          error,
          permissionState: "denied",
        };
      }

      // Get location using simplified function
      const result = await getCurrentLocation();

      if (result.success && result.position) {
        const { latitude, longitude, accuracy } = result.position.coords;
        console.log("Location accuracy:", accuracy, "meters");

        const coordinates: [number, number] = [longitude, latitude];

        // Update permission state to granted
        this.callbacks?.onPermissionChange("granted");
        this.callbacks?.onLocationUpdate(coordinates);

        return {
          success: true,
          coordinates,
          permissionState: "granted",
        };
      } else if (result.error) {
        const errorMessage = result.error.message || "Failed to get location";
        this.handleLocationError(result.error, showToasts);
        return {
          success: false,
          error: errorMessage,
          permissionState: permissionState,
        };
      } else {
        const error = "Unknown location error";
        if (showToasts) {
          toast.error("Location Error", {
            description: error,
          });
        }
        this.callbacks?.onError(error);
        return {
          success: false,
          error,
          permissionState: permissionState,
        };
      }
    } catch (error) {
      console.error("Location request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get location";

      if (showToasts) {
        toast.error("Location request failed", {
          description: "Please try again",
        });
      }

      this.callbacks?.onError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        permissionState: "unknown",
      };
    }
  }

  // Handle location errors
  private handleLocationError(
    error: GeolocationPositionError,
    showToasts: boolean = true
  ) {
    let errorMessage: string;
    let permissionState: LocationPermissionState = "unknown";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        permissionState = "denied";
        errorMessage =
          "Location permission denied. Please enable location access in your browser settings.";
        break;

      case error.POSITION_UNAVAILABLE:
        errorMessage =
          "Location information unavailable. GPS signal may be weak or unavailable.";
        break;

      case error.TIMEOUT:
        errorMessage = "Location request timed out. Please try again.";
        break;

      default:
        errorMessage = `Location error: ${error.message}`;
        break;
    }

    if (showToasts) {
      toast.error("Location Error", {
        description: errorMessage,
      });
    }

    this.callbacks?.onPermissionChange(permissionState);
    this.callbacks?.onError(errorMessage);
  }

  // Reset location service state
  reset() {
    // No state to reset
  }

  // Check if we should show permission prompt
  async shouldShowPermissionPrompt(): Promise<boolean> {
    const permission = await this.getPermissionState();
    return permission === "prompt" || permission === "unknown";
  }

  // Check if permission is denied
  async isPermissionDenied(): Promise<boolean> {
    const permission = await this.getPermissionState();
    return permission === "denied";
  }

  // Get user-friendly permission status text
  async getPermissionStatusText(): Promise<string> {
    const permission = await this.getPermissionState();

    switch (permission) {
      case "granted":
        return "Location access granted";
      case "denied":
        return "Location access denied";
      case "prompt":
        return "Location permission required";
      case "unknown":
        return "Location permission unknown";
      default:
        return "Location status unknown";
    }
  }

  // Get appropriate button text based on state
  async getLocationButtonText(): Promise<string> {
    const permission = await this.getPermissionState();

    if (permission === "granted") {
      return "Go to My Location";
    } else if (permission === "denied") {
      return "Get Location Permission";
    } else {
      return "Allow Location Access";
    }
  }

  // Get appropriate button icon based on state
  async getLocationButtonIcon(): Promise<string> {
    const permission = await this.getPermissionState();

    if (permission === "granted") {
      return "📍";
    } else if (permission === "denied") {
      return "🔒";
    } else {
      return "🎯";
    }
  }

  // Check if a location is within the 50-meter circle around user
  async isLocationInCircle(
    targetLat: number,
    targetLng: number
  ): Promise<boolean | null> {
    const currentLocation = await this.getCurrentLocation();

    if (!currentLocation) {
      return null; // User location not available
    }

    const [userLng, userLat] = currentLocation;
    const distance = this.calculateDistance(
      userLat,
      userLng,
      targetLat,
      targetLng
    );

    // 50 metre yarıçap
    const circleRadius = USER_LOCATION_CIRCLE_RADIUS;
    return distance <= circleRadius;
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLng = this.degreesToRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    return distance;
  }

  // Convert degrees to radians
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get circle radius in meters
  getCircleRadius(): number {
    return USER_LOCATION_CIRCLE_RADIUS; // 50 metre yarıçap
  }

  // Get current circle center coordinates
  async getCircleCenter(): Promise<[number, number] | null> {
    return await this.getCurrentLocation();
  }
}

// Singleton instance for global use
export const locationService = new LocationService();
