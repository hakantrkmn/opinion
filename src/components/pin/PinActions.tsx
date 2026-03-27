"use client";

import { Button } from "@/components/ui/button";
import { Navigation, RefreshCcw, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PinActionsProps {
  pinCoordinates?: { lat: number; lng: number };
  pinId: string;
  pinName: string;
  onRefresh?: () => Promise<void> | void;
}

export default function PinActions({
  pinCoordinates,
  pinId,
  pinName,
  onRefresh,
}: PinActionsProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleDirections = () => {
    if (!pinCoordinates) return;

    const { lat, lng } = pinCoordinates;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (!pinCoordinates) return;

    const { lat, lng } = pinCoordinates;
    const currentUrl = window.location.origin;
    const shareUrl = `${currentUrl}/?lat=${lat.toFixed(6)}&long=${lng.toFixed(
      6
    )}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!", {
        description: "Share this link to show others this location",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.info("Share URL", {
        description: shareUrl,
        duration: 5000,
      });
    }
  };

  const handleRefresh = async () => {
    if (refreshing || !onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {pinCoordinates && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={handleDirections}
            title="Get directions in Google Maps"
            className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 border-none text-white shadow-sm"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Directions</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            title="Share this location"
            className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 border-border/60 hover:bg-muted/60"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </>
      )}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh comments"
          className="h-8 w-8 p-0 rounded-lg border-border/60 hover:bg-muted/60"
        >
          <RefreshCcw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      )}
    </div>
  );
}
