import { RefreshCcw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  currentZoom: number;
  minZoomLevel?: number;
  className?: string;
}

export const RefreshButton = ({
  onRefresh,
  isRefreshing,
  currentZoom,
  minZoomLevel = 12,
  className,
}: RefreshButtonProps) => {
  const isZoomSufficient = currentZoom >= minZoomLevel;
  const [justClicked, setJustClicked] = useState(false);

  const handleClick = () => {
    if (!isRefreshing && isZoomSufficient) {
      setJustClicked(true);
      onRefresh();
      setTimeout(() => setJustClicked(false), 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing || !isZoomSufficient}
      className={`${className ?? ""} h-11 w-11 rounded-xl backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-border active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 ${
        !isZoomSufficient
          ? "opacity-40 bg-background/70"
          : "opacity-100 bg-background/90"
      } ${isZoomSufficient && !isRefreshing ? "animate-pulse" : ""}`}
      title={
        !isZoomSufficient
          ? `Zoom in to level ${minZoomLevel} or higher to refresh pins`
          : "Refresh pins"
      }
      aria-label="Refresh pins"
    >
      <RefreshCcw
        className={`h-4 w-4 text-foreground transition-transform duration-300 ${
          isRefreshing
            ? "animate-spin"
            : justClicked
            ? "rotate-180"
            : ""
        }`}
      />
    </button>
  );
};
