"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useMyCommunities } from "@/features/communities/hooks/use-communities";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { CreatePinDialog } from "@/features/pins/components/CreatePinDialog";
import { PinDetailSheet } from "@/features/pins/components/PinDetailSheet";
import { useSession } from "@/features/auth/hooks/useSession";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBasemapSync, useResolvedBasemap } from "../hooks/useBasemap";
import { clearDeepLinkParams, useDeepLinkPin } from "../hooks/useDeepLinkPin";
import { useDropPin } from "../hooks/useDropPin";
import { useEmptyAreaHint } from "../hooks/useEmptyAreaHint";
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
  const t = useTranslations("map");
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
  const { filter, setFilter } = useMapScope();
  const scope = filter.scope;
  const communities = useMyCommunities();
  const queryClient = useQueryClient();

  // A community the viewer left (or was removed from): back to everyone.
  const staleCommunity =
    scope === "community" &&
    !sessionLoading &&
    (!user || (!!communities.data && !communities.data.some((c) => c.id === filter.communityId)));
  useEffect(() => {
    if (staleCommunity) setFilter({ scope: "all", communityId: null });
  }, [staleCommunity, setFilter]);

  const pins = useMapPins(map, staleCommunity ? { scope: "all", communityId: null } : filter);

  // Removed from the community since the list was fetched: the map answers
  // 404. Refresh the list (which drops it) and fall back to everyone.
  const lostCommunity =
    scope === "community" && pins.error instanceof ApiError && pins.error.status === 404;
  useEffect(() => {
    if (!lostCommunity) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.communities.mine });
    setFilter({ scope: "all", communityId: null });
  }, [lostCommunity, queryClient, setFilter]);
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
  const nothingInView =
    !pins.isFetching &&
    pins.mode !== null &&
    pins.clustersFC.features.length === 0 &&
    pins.pinsFC.features.length === 0;
  const followingHint =
    scope === "all" || sessionLoading || staleCommunity
      ? null
      : scope === "following" && !user
        ? ("signin" as const)
        : nothingInView
          ? scope === "community"
            ? ("communityEmpty" as const)
            : ("empty" as const)
          : null;

  // "All" scope and nothing loaded in view: point at the closest opinion.
  const emptyArea = useEmptyAreaHint(
    map,
    scope === "all" &&
      !pins.isFetching &&
      !pins.isError &&
      pins.mode !== null &&
      pins.clustersFC.features.length === 0 &&
      pins.pinsFC.features.length === 0
  );
  const focusPin = useMapUiStore((s) => s.focusPin);

  return (
    <div className="relative h-full w-full overflow-clip">
      <div
        ref={containerRef}
        className="h-full w-full select-none [-webkit-touch-callout:none]"
        aria-label={t("mapLabel")}
      />

      {/* Floating UI; the wrapper ignores pointer events so the map stays draggable. */}
      <div className="pointer-events-none absolute inset-0 z-(--z-map-controls)">
        <div className="absolute left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
          <ScopeToggle
            filter={filter}
            onChange={setFilter}
            onRequireSignIn={requireSignIn}
            signedIn={!!user}
            communities={communities.data}
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
            emptyArea={emptyArea}
            onRetry={() => void pins.refetch()}
            onSignIn={requireSignIn}
            onShowNearest={focusPin}
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
        communityId={scope === "community" && !staleCommunity ? filter.communityId : null}
      />
      <CreatePinDialog
        defaultCommunityId={scope === "community" && !staleCommunity ? filter.communityId : null}
      />
      <SignInPrompt />
    </div>
  );
}
