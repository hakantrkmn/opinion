import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  currentZoom: number;
  minZoomLevel?: number;
}

export const RefreshButton = ({
  onRefresh,
  isRefreshing,
  currentZoom,
  minZoomLevel = 12, // Default minimum zoom level
}: RefreshButtonProps) => {
  const isZoomSufficient = currentZoom >= minZoomLevel;
  const [justClicked, setJustClicked] = useState(false);

  const handleClick = () => {
    if (!isRefreshing && isZoomSufficient) {
      setJustClicked(true);
      onRefresh();
      // Reset animation after it completes
      setTimeout(() => setJustClicked(false), 300);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isRefreshing || !isZoomSufficient}
      variant="outline"
      size="icon"
      className={`fixed top-20 left-4 z-30 rounded-full shadow-lg !bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105 disabled:hover:scale-100 ${!isZoomSufficient ? "opacity-50" : "opacity-100 animate-pulse"
        }`}
      title={
        !isZoomSufficient
          ? `Zoom in to level ${minZoomLevel} or higher to refresh pins`
          : "Refresh pins"
      }
    >
      <RefreshCcw
        className={`h-4 w-4 sm:h-4 sm:w-4 transition-transform duration-300 ${
          isRefreshing 
            ? "animate-spin" 
            : justClicked 
            ? "rotate-180" 
            : ""
        }`}
      />
    </Button>
  );
};
