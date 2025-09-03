import { Button } from "@/components/ui/button";

interface LocationButtonProps {
  userLocation: [number, number] | null;
  locationPermission: string | null;
  onGetLocation: () => void;
  onGoToLocation: () => void;
  isMobile?: boolean;
}

export const LocationButton = ({
  userLocation,
  locationPermission,
  onGetLocation,
  onGoToLocation,
  isMobile = false,
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

  const getButtonIcon = () => {
    if (userLocation) {
      return "📍";
    } else if (locationPermission === "denied") {
      return "🔒";
    } else {
      return "🎯";
    }
  };

  const isDisabled = locationPermission === "loading";

  if (isMobile) {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size="icon"
        className="shadow-lg flex-shrink-0 !bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-background transition-all duration-200"
        title={getButtonTitle()}
        disabled={isDisabled}
      >
        {locationPermission === "loading" ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : (
          <span className="text-base">{getButtonIcon()}</span>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="icon"
      className="shadow-lg h-8 w-8 flex-shrink-0 !bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-background transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
      title={getButtonTitle()}
      disabled={isDisabled}
    >
      {locationPermission === "loading" ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
      ) : (
        <span className="transition-transform duration-200">
          {getButtonIcon()}
        </span>
      )}
    </Button>
  );
};
