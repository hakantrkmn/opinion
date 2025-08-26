import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

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

  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing || !isZoomSufficient}
      variant="outline"
      size="icon"
      className={`fixed top-20 right-4 z-30 rounded-full shadow-lg transition-opacity ${!isZoomSufficient ? "opacity-50" : "opacity-100"
        }`}
      title={
        !isZoomSufficient
          ? `Zoom in to level ${minZoomLevel} or higher to refresh pins`
          : "Refresh pins"
      }
    >
      <RefreshCcw
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
      />
    </Button>
  );
};
