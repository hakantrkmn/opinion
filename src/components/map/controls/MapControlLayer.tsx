"use client";

import { RefreshButton } from "@/components/common/RefreshButton";
import { useSession } from "@/hooks/useSession";
import type { MapScope } from "@/hooks/map/use-map-scope";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LocationButton } from "../LocationButton";
import { MapStyleToggle } from "../MapStyleToggle";
import { ThemeToggle } from "../ThemeToggle";
import { MapScopeToggle } from "./MapScopeToggle";

interface MapControlLayerProps {
  hidden?: boolean;
  currentStyle: string;
  onStyleChange: (style: string) => void;
  scope: MapScope;
  onScopeChange: (scope: MapScope) => void;
  userLocation: [number, number] | null;
  locationPermission: string | null;
  onGetLocation: () => void;
  onGoToLocation: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  currentZoom: number;
}

export function MapControlLayer({
  hidden = false,
  currentStyle,
  onStyleChange,
  scope,
  onScopeChange,
  userLocation,
  locationPermission,
  onGetLocation,
  onGoToLocation,
  onRefresh,
  isRefreshing,
  currentZoom,
}: MapControlLayerProps) {
  const { user } = useSession();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-30 transition-opacity duration-200",
        hidden ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="pointer-events-auto absolute left-4 top-4 pt-safe">
        <RefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          currentZoom={currentZoom}
          minZoomLevel={0}
        />
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col gap-2 pt-safe">
        <ThemeToggle />
        <LocationButton
          userLocation={userLocation}
          locationPermission={locationPermission}
          onGetLocation={onGetLocation}
          onGoToLocation={onGoToLocation}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-4 right-4 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 pb-safe">
        <MapScopeToggle
          scope={scope}
          onScopeChange={onScopeChange}
          disableFollowing={!user}
        />
        {!user ? (
          <Link
            href="/auth"
            className="rounded-xl border border-border/50 bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-muted/40"
          >
            Sign in for Following
          </Link>
        ) : null}
        <MapStyleToggle
          currentStyle={currentStyle}
          onStyleChange={onStyleChange}
          isMobile={true}
        />
      </div>
    </div>
  );
}
