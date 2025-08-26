// Geolocation utilities for better mobile support

export interface GeolocationResult {
  success: boolean;
  position?: GeolocationPosition;
  error?: GeolocationPositionError;
  permissionState?: PermissionState;
}

export const checkGeolocationSupport = (): boolean => {
  return "geolocation" in navigator;
};

export const checkPermissionAPI = (): boolean => {
  return "permissions" in navigator;
};

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

export const isHTTPS = (): boolean => {
  return location.protocol === "https:" || location.hostname === "localhost";
};

export const getMobileGeolocationOptions = (): PositionOptions => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return {
    enableHighAccuracy: isMobile, // High accuracy for mobile devices
    timeout: isMobile ? 15000 : 10000, // Longer timeout for mobile
    maximumAge: isMobile ? 60000 : 300000, // Shorter cache for mobile
  };
};

export const getGeolocationWithFallback = (): Promise<GeolocationResult> => {
  return new Promise((resolve) => {
    if (!checkGeolocationSupport()) {
      resolve({
        success: false,
        error: {
          code: 2,
          message: "Geolocation not supported",
        } as GeolocationPositionError,
      });
      return;
    }

    const options = getMobileGeolocationOptions();

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

export const getDetailedErrorMessage = (
  error: GeolocationPositionError
): string => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  switch (error.code) {
    case error.PERMISSION_DENIED:
      if (isMobile) {
        return "Location permission denied. Check device settings for location services and browser permissions.";
      }
      return "Location permission denied. Please enable location access in your browser settings.";

    case error.POSITION_UNAVAILABLE:
      if (isMobile) {
        return "Location information unavailable. Make sure you're in an open area and GPS is enabled.";
      }
      return "Location information unavailable. GPS signal may be weak.";

    case error.TIMEOUT:
      return "Location request timed out. Please try again.";

    default:
      return `Location error: ${error.message}`;
  }
};

export const getMobileInstructions = (): string[] => {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return [
      "Settings → Privacy & Security → Location Services → On",
      "Settings → Safari → Location → Allow",
      "Refresh the page and try again",
    ];
  } else if (/Android/i.test(userAgent)) {
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
