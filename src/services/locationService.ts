import { LocationPermissionState } from "@/types";
import {
  checkGeolocationSupport,
  checkIOSPermissionState,
  getDetailedErrorMessage,
  getGeolocationWithFallback,
  getIOSGeolocation,
  isIOS,
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
  private permissionState: LocationPermissionState = null;
  private currentLocation: [number, number] | null = null;
  private callbacks: LocationServiceCallbacks | null = null;

  constructor(callbacks?: LocationServiceCallbacks) {
    this.callbacks = callbacks || null;
  }

  // Set callbacks for the service
  setCallbacks(callbacks: LocationServiceCallbacks) {
    this.callbacks = callbacks;
  }

  // Get current permission state
  getPermissionState(): LocationPermissionState {
    return this.permissionState;
  }

  // Get current location if available
  getCurrentLocation(): [number, number] | null {
    return this.currentLocation;
  }

  // Check if location permission is granted
  hasLocationPermission(): boolean {
    return this.permissionState === "granted" && this.currentLocation !== null;
  }

  // Initialize location service and check initial permission state
  async initialize(): Promise<void> {
    // Check geolocation support
    if (!checkGeolocationSupport()) {
      this.updatePermissionState("denied");
      this.callbacks?.onError(
        "Location services not supported by your browser"
      );
      return;
    }

    // Check initial permission state for iOS
    if (isIOS()) {
      const permissionState = await checkIOSPermissionState();
      console.log("iOS permission state:", permissionState);

      if (permissionState === "granted") {
        // Permission already granted, get location
        await this.requestLocation(false);
      } else if (permissionState === "denied") {
        // Permission denied, show denied state
        this.updatePermissionState("denied");
      } else {
        // Permission prompt or unknown, show prompt state
        this.updatePermissionState("prompt");
      }
      return;
    }

    // For non-iOS devices, try to get location immediately
    await this.requestLocation(false);
  }

  // Request location permission and get current location
  async requestLocation(showToasts: boolean = true): Promise<LocationResult> {
    // Check geolocation support first
    if (!checkGeolocationSupport()) {
      const error = "Location services not supported";
      this.updatePermissionState("denied");
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

    this.updatePermissionState("loading");

    try {
      // iOS için özel geolocation fonksiyonu kullan
      const result = isIOS()
        ? await getIOSGeolocation()
        : await getGeolocationWithFallback();

      if (result.success && result.position) {
        const { latitude, longitude, accuracy } = result.position.coords;
        console.log("Location accuracy:", accuracy, "meters");

        const coordinates: [number, number] = [longitude, latitude];
        this.currentLocation = coordinates;
        this.updatePermissionState("granted");

        // iOS'ta başarılı konum alımını localStorage'a kaydet
        if (isIOS()) {
          try {
            localStorage.setItem("ios-location-permission", "granted");
          } catch (error) {
            console.log("Failed to save iOS permission state:", error);
          }
        }

        this.callbacks?.onLocationUpdate(coordinates);

        return {
          success: true,
          coordinates,
          permissionState: "granted",
        };
      } else if (result.error) {
        const errorMessage = getDetailedErrorMessage(result.error);
        this.handleLocationError(result.error, showToasts);
        return {
          success: false,
          error: errorMessage,
          permissionState: this.permissionState,
        };
      } else {
        const error = "Unknown location error";
        this.updatePermissionState("denied");
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
    } catch (error) {
      console.error("Location request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get location";

      // iOS'ta unexpected error durumunda da prompt state'e dön
      if (isIOS()) {
        this.updatePermissionState("prompt");
        if (showToasts) {
          toast.error("Location request failed", {
            description: "Please try again by tapping 'Allow Location Access'",
          });
        }
      } else {
        this.updatePermissionState("denied");
        if (showToasts) {
          toast.error("Unexpected error", {
            description: "An error occurred while getting location",
          });
        }
      }

      this.callbacks?.onError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        permissionState: this.permissionState,
      };
    }
  }

  // Handle location errors
  private handleLocationError(
    error: GeolocationPositionError,
    showToasts: boolean = true
  ) {
    const errorMessage = getDetailedErrorMessage(error);

    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.updatePermissionState("denied");
        // iOS'ta permission denied durumunda localStorage'ı temizle
        if (isIOS()) {
          try {
            localStorage.removeItem("ios-location-permission");
          } catch (e) {
            console.log("Failed to clear iOS permission state:", e);
          }
        }
        break;

      case error.POSITION_UNAVAILABLE:
      case error.TIMEOUT:
        // Keep current permission state for these errors
        break;

      default:
        // iOS'ta unexpected error durumunda prompt state'e dön
        if (isIOS()) {
          this.updatePermissionState("prompt");
        } else {
          this.updatePermissionState("denied");
        }
        break;
    }

    if (showToasts) {
      toast.error("Location Error", {
        description: errorMessage,
      });
    }

    this.callbacks?.onError(errorMessage);
  }

  // Update permission state and notify callbacks
  private updatePermissionState(state: LocationPermissionState) {
    this.permissionState = state;
    this.callbacks?.onPermissionChange(state);
  }

  // Reset location service state
  reset() {
    this.permissionState = null;
    this.currentLocation = null;
  }

  // Check if we should show permission prompt
  shouldShowPermissionPrompt(): boolean {
    return this.permissionState === "prompt" || this.permissionState === null;
  }

  // Check if permission is denied
  isPermissionDenied(): boolean {
    return this.permissionState === "denied";
  }

  // Check if location is loading
  isLoading(): boolean {
    return this.permissionState === "loading";
  }

  // Get user-friendly permission status text
  getPermissionStatusText(): string {
    switch (this.permissionState) {
      case "granted":
        return "Location access granted";
      case "denied":
        return "Location access denied";
      case "prompt":
        return "Location permission required";
      case "loading":
        return "Getting location...";
      case null:
        return "Location permission unknown";
      default:
        return "Location status unknown";
    }
  }

  // Get appropriate button text based on state
  getLocationButtonText(): string {
    if (this.hasLocationPermission()) {
      return "Go to My Location";
    } else if (this.permissionState === "denied") {
      return "Get Location Permission";
    } else if (this.permissionState === "loading") {
      return "Getting Location...";
    } else {
      return "Allow Location Access";
    }
  }

  // Get appropriate button icon based on state
  getLocationButtonIcon(): string {
    if (this.hasLocationPermission()) {
      return "📍";
    } else if (this.permissionState === "denied") {
      return "🔒";
    } else if (this.permissionState === "loading") {
      return "⏳";
    } else {
      return "🎯";
    }
  }
}

// Singleton instance for global use
export const locationService = new LocationService();
