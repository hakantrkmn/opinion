"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { CreatePinDialog } from "@/features/pins/components/CreatePinDialog";
import { PinDetailSheet } from "@/features/pins/components/PinDetailSheet";
import { useSession } from "@/features/auth/hooks/useSession";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBasemapSync, useResolvedBasemap } from "../hooks/useBasemap";
import { clearDeepLinkParams, useDeepLinkPin } from "../hooks/useDeepLinkPin";
import { useDropPin } from "../hooks/useDropPin";
import { useLayerManager } from "../hooks/useLayerManager";
import { useLocationWatch } from "../hooks/useLocationWatch";
import { useMapInteractions } from "../hooks/useMapInteractions";
import { useMapLayerData } from "../hooks/useMapLayerData";
import { useMapLibre } from "../hooks/useMapLibre";
import { useMapPins } from "../hooks/useMapPins";
import { useMapScope } from "../hooks/useMapScope";
import { BASEMAPS } from "../lib/basemaps";
import {
  DEEP_LINK_ZOOM,
  DEFAULT_VIEW,
  readCachedView,
  type MapView,
} from "../lib/view";
import type { LngLat } from "../lib/geo";
import { useMapUiStore } from "../store/ui-store";
import { BasemapPicker } from "./BasemapPicker";
import { DropPinButton } from "./DropPinButton";
import { IntroCard } from "./IntroCard";
import { LocateButton } from "./LocateButton";
import { MapStatus } from "./MapStatus";
import { RefreshButton } from "./RefreshButton";
import { ScopeToggle } from "./ScopeToggle";
import { SignInPrompt } from "./SignInPrompt";
import { ThemeToggle } from "./ThemeToggle";

export interface MapScreenProps {
  /** From `?lat=&lng=` (deep link). */
  initialCenter: LngLat | null;
  /** From `?pin=` (deep link). */
  initialPinId: string | null;
}

export default function MapScreen({ initialCenter, initialPinId }: MapScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const basemap = useResolvedBasemap();
  const [initial] = useState(() => ({
    view: (initialCenter
      ? { center: initialCenter, zoom: DEEP_LINK_ZOOM }
      : readCachedView() ?? DEFAULT_VIEW) satisfies MapView,
    styleUrl: BASEMAPS[basemap].url,
  }));

  const map = useMapLibre(containerRef, {
    initialView: initial.view,
    styleUrl: initial.styleUrl,
  });
  const manager = useLayerManager(map, BASEMAPS[basemap].dark);
  useBasemapSync(map, manager, basemap);

  const { user, isLoading: sessionLoading } = useSession();
  const { scope, setScope } = useMapScope();

  const pins = useMapPins(map, scope);
  useEffect(() => {
    manager?.setData("serverClusters", pins.clustersFC);
  }, [manager, pins.clustersFC]);
  useEffect(() => {
    manager?.setData("pins", pins.pinsFC);
  }, [manager, pins.pinsFC]);

  useLocationWatch();
  useMapLayerData(manager);

  const selectedPinId = useMapUiStore((s) => s.selectedPinId);
  const selectPin = useMapUiStore((s) => s.selectPin);
  const setSignInPromptOpen = useMapUiStore((s) => s.setSignInPromptOpen);
  const requireSignIn = useCallback(
    () => setSignInPromptOpen(true),
    [setSignInPromptOpen]
  );
  const closePin = useCallback(() => {
    selectPin(null);
    clearDeepLinkParams();
  }, [selectPin]);

  const { locating, dropAtMyLocation, dropAt } = useDropPin(map);
  useMapInteractions(map, { onSelectPin: selectPin, onLongPress: dropAt });
  useDeepLinkPin(map, initialPinId, !!initialCenter);

  // Anonymous "following" is an empty list server-side: explain instead.
  const followingHint =
    scope !== "following" || sessionLoading
      ? null
      : !user
        ? ("signin" as const)
        : !pins.isFetching &&
            pins.mode !== null &&
            pins.clustersFC.features.length === 0 &&
            pins.pinsFC.features.length === 0
          ? ("empty" as const)
          : null;

  return (
    <div className="relative h-full w-full overflow-clip">
      <div
        ref={containerRef}
        className="h-full w-full select-none [-webkit-touch-callout:none]"
        aria-label="Map of pins"
      />

      {/* Floating UI; the wrapper ignores pointer events so the map stays draggable. */}
      <div className="pointer-events-none absolute inset-0 z-(--z-map-controls)">
        <div className="absolute left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
          <ScopeToggle
            scope={scope}
            onChange={setScope}
            onRequireSignIn={requireSignIn}
            signedIn={!!user}
          />
          <div className="flex flex-col gap-2">
            <ThemeToggle />
            <BasemapPicker />
            <LocateButton map={map} />
            <RefreshButton fetching={pins.isFetching} />
          </div>
        </div>

        <div className="absolute left-1/2 top-16 -translate-x-1/2 sm:top-4">
          <MapStatus
            fetching={pins.isFetching}
            error={pins.isError}
            truncated={pins.truncated}
            followingHint={followingHint}
            onRetry={() => void pins.refetch()}
            onSignIn={requireSignIn}
          />
        </div>

        <div className="absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)] flex justify-center sm:inset-x-auto sm:bottom-12 sm:left-4 sm:justify-start">
          <IntroCard />
        </div>


        <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] sm:bottom-4 sm:right-4">
          <DropPinButton locating={locating} onClick={() => void dropAtMyLocation()} />
        </div>
      </div>

      <PinDetailSheet
        pinId={selectedPinId}
        onClose={closePin}
        onRequireSignIn={requireSignIn}
      />
      <CreatePinDialog />
      <SignInPrompt />
    </div>
  );
}
