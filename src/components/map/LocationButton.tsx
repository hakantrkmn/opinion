import { Crosshair, Loader2, Lock, Navigation } from "lucide-react";

interface LocationButtonProps {
  userLocation: [number, number] | null;
  locationPermission: string | null;
  onGetLocation: () => void;
  onGoToLocation: () => void;
  isMobile?: boolean;
  className?: string;
}

export const LocationButton = ({
  userLocation,
  locationPermission,
  onGetLocation,
  onGoToLocation,
  isMobile = false,
  className = "",
}: LocationButtonProps) => {
  const handleClick = () => {
    if (userLocation) {
      onGoToLocation();
    } else {
      onGetLocation();
    }
  };

  const getButtonTitle = () => {
    if (userLocation) {
      return "Go to My Location";
    } else if (locationPermission === "denied") {
      return "Get Location Permission";
    } else if (locationPermission === "loading") {
      return "Getting Location...";
    } else {
      return "Allow Location Access";
    }
  };

  const isDisabled = locationPermission === "loading";
  const isDenied = locationPermission === "denied";
  const hasLocation = !!userLocation;

  const size = isMobile ? "h-10 w-10" : "h-9 w-9";

  return (
    <button
      onClick={handleClick}
      className={`${size} ${className} rounded-xl backdrop-blur-md border shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
        hasLocation
          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 hover:border-emerald-500/50"
          : isDenied
          ? "bg-background/90 border-red-500/30 hover:border-red-500/50"
          : "bg-background/90 border-border/50 hover:border-border"
      }`}
      title={getButtonTitle()}
      disabled={isDisabled}
      aria-label={getButtonTitle()}
    >
      {isDisabled ? (
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
      ) : hasLocation ? (
        <Navigation className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
      ) : isDenied ? (
        <Lock className="h-4 w-4 text-red-400" />
      ) : (
        <Crosshair className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
};
