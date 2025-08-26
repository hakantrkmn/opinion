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

  const isIOSDevice = isIOS();

  return {
    enableHighAccuracy: isMobile, // High accuracy for mobile devices
    timeout: isIOSDevice ? 30000 : isMobile ? 15000 : 10000, // Much longer timeout for iOS
    maximumAge: isIOSDevice ? 300000 : isMobile ? 60000 : 300000, // Longer cache for iOS
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

export const getIOSLocationPrompt = (): string => {
  return "On iOS, location permission requires user interaction. Tap 'Allow Location' to enable location services.";
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

export const checkIOSPermissionState = async (): Promise<
  "prompt" | "granted" | "denied" | "unknown"
> => {
  if (!isIOS()) {
    return "unknown";
  }

  try {
    // iOS'ta permissions API varsa kullan ama güvenme
    if ("permissions" in navigator) {
      const result = await navigator.permissions.query({ name: "geolocation" });
      // iOS'ta permissions API güvenilmez, her zaman "prompt" döner
      console.log("iOS Permissions API result:", result.state);
    }

    // iOS'ta her zaman prompt olarak varsay
    return "prompt";
  } catch (error) {
    console.log("iOS permission check failed:", error);
    return "prompt";
  }
};

// iOS'a özel geolocation fonksiyonu
export const getIOSGeolocation = (): Promise<GeolocationResult> => {
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

    // iOS'a özel options
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 saniye timeout
      maximumAge: 300000, // 5 dakika cache
    };

    console.log("iOS: Starting geolocation request with options:", options);

    let resolved = false;

    // Manual timeout handler
    const handleTimeout = () => {
      if (!resolved) {
        resolved = true;
        console.log("iOS: Manual timeout after 25 seconds");
        resolve({
          success: false,
          error: {
            code: 3,
            message: "iOS location request timed out",
          } as GeolocationPositionError,
        });
      }
    };

    // Set manual timeout (shorter than options.timeout)
    const timeoutId = setTimeout(handleTimeout, 25000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.log("iOS: Location success:", position);
          resolve({
            success: true,
            position,
          });
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.log("iOS: Location error:", error);
          resolve({
            success: false,
            error,
          });
        }
      },
      options
    );
  });
};
