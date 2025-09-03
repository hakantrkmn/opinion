// Simplified geolocation utilities for better mobile support

export interface GeolocationResult {
  success: boolean;
  position?: GeolocationPosition;
  error?: GeolocationPositionError;
}

// Check if geolocation is supported by the browser
export const checkGeolocationSupport = (): boolean => {
  return "geolocation" in navigator;
};

// Check if permissions API is supported
export const checkPermissionAPI = (): boolean => {
  return "permissions" in navigator;
};

// Get current geolocation permission state
export const getGeolocationPermission =
  async (): Promise<PermissionState | null> => {
    if (!checkPermissionAPI()) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state;
    } catch (error) {
      console.warn("Permission API query failed:", error);
      return null;
    }
  };

// Check if current protocol is HTTPS or localhost
export const isHTTPS = (): boolean => {
  return location.protocol === "https:" || location.hostname === "localhost";
};

// Get optimized geolocation options for mobile devices
export const getGeolocationOptions = (): PositionOptions => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return {
    enableHighAccuracy: isMobile, // High accuracy for mobile devices
    timeout: isMobile ? 20000 : 10000, // 20s for mobile, 10s for desktop
    maximumAge: 0, // No cache - always get fresh location
  };
};

// Get current location with simple error handling
export const getCurrentLocation = (): Promise<GeolocationResult> => {
  return new Promise((resolve) => {
    if (!checkGeolocationSupport()) {
      resolve({
        success: false,
        error: {
          code: 2,
          message: "Geolocation not supported by this browser",
        } as GeolocationPositionError,
      });
      return;
    }

    const options = getGeolocationOptions();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          position,
        });
      },
      (error) => {
        resolve({
          success: false,
          error,
        });
      },
      options
    );
  });
};

// Get user-friendly error messages
export const getErrorMessage = (error: GeolocationPositionError): string => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  switch (error.code) {
    case error.PERMISSION_DENIED:
      if (isMobile) {
        return "Location permission denied. Please enable location access in your device settings and browser.";
      }
      return "Location permission denied. Please enable location access in your browser settings.";

    case error.POSITION_UNAVAILABLE:
      if (isMobile) {
        return "Location unavailable. Make sure you're in an open area and GPS is enabled.";
      }
      return "Location unavailable. GPS signal may be weak or unavailable.";

    case error.TIMEOUT:
      return "Location request timed out. Please try again.";

    default:
      return `Location error: ${error.message}`;
  }
};

// Device detection utilities
export const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Get device-specific location instructions
export const getLocationInstructions = (): string[] => {
  if (isIOS()) {
    return [
      "Settings → Privacy & Security → Location Services → On",
      "Settings → Safari → Location → Allow",
      "Refresh the page and try again",
    ];
  } else if (isAndroid()) {
    return [
      "Settings → Location → On",
      "Settings → Apps → Browser → Permissions → Location → Allow",
      "Refresh the page and try again",
    ];
  } else {
    return [
      "Enable location permission in browser settings",
      "Refresh the page and try again",
    ];
  }
};

// Legacy function names for backward compatibility
export const getGeolocationWithFallback = getCurrentLocation;
export const getDetailedErrorMessage = getErrorMessage;
export const getMobileGeolocationOptions = getGeolocationOptions;
export const getIOSLocationPrompt = () =>
  "On iOS, location permission requires user interaction. Tap 'Allow Location' to enable location services.";
export const getMobileInstructions = getLocationInstructions;

// Simplified iOS-specific functions (no cache, no complex state management)
export const checkIOSPermissionState = async (): Promise<
  "prompt" | "granted" | "denied" | "unknown"
> => {
  if (!isIOS()) {
    return "unknown";
  }

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
};

export const getIOSGeolocation = (): Promise<GeolocationResult> => {
  // iOS için özel bir şey yapmaya gerek yok, normal geolocation kullan
  return getCurrentLocation();
};
