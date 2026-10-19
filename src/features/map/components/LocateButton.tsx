"use client";

import { cn } from "@/lib/utils";
import { Crosshair, Loader2, LocateFixed, LocateOff } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { startLocationWatch } from "../hooks/useLocationWatch";
import { useLocationStore } from "../store/location-store";
import { mapControl } from "./control-styles";

const LOCATE_ZOOM = 16;

export function LocateButton({ map }: { map: MapLibreMap | null }) {
  const fix = useLocationStore((s) => s.fix);
  const permission = useLocationStore((s) => s.permission);
  const locating = useLocationStore((s) => s.locating);
  const flyOnFixRef = useRef(false);

  useEffect(() => {
    if (!fix || !map || !flyOnFixRef.current) return;
    flyOnFixRef.current = false;
    map.flyTo({
      center: [fix.lng, fix.lat],
      zoom: Math.max(map.getZoom(), LOCATE_ZOOM),
      essential: true,
    });
  }, [fix, map]);

  const onClick = () => {
    if (fix && map) {
      map.flyTo({
        center: [fix.lng, fix.lat],
        zoom: Math.max(map.getZoom(), LOCATE_ZOOM),
        essential: true,
      });
      return;
    }
    if (permission === "denied") {
      toast.error("Location is blocked", {
        description: "Allow location access for this site in your browser settings.",
      });
      return;
    }
    if (permission === "unsupported") {
      toast.error("Your browser doesn't support location");
      return;
    }
    flyOnFixRef.current = true;
    startLocationWatch();
  };

  const label = fix
    ? "Show my location"
    : permission === "denied"
      ? "Location blocked"
      : "Find my location";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(mapControl, fix && "text-blue-500")}
      aria-label={label}
      title={label}
      aria-busy={locating}
    >
      {locating ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : fix ? (
        <LocateFixed className="h-4 w-4" />
      ) : permission === "denied" ? (
        <LocateOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Crosshair className="h-4 w-4" />
      )}
    </button>
  );
}
