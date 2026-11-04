"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { MapScreenProps } from "./MapScreen";

function MapLoading() {
  const t = useTranslations("map");
  return (
    <div className="h-full w-full animate-pulse bg-muted/40" aria-busy="true" aria-label={t("loadingMap")} />
  );
}

/** The single client-only boundary for MapLibre (no SSR for WebGL). */
const MapScreen = dynamic(() => import("./MapScreen"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export function MapLoader(props: MapScreenProps) {
  return <MapScreen {...props} />;
}
