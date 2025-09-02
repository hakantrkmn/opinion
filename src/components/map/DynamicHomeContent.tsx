"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Use normal header always
const Header = dynamic(() => import("../common/Header"), {
  loading: () => (
    <div className="h-16 bg-background border-b flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  ),
});

const WelcomeScreen = dynamic(() => import("../common/WelcomeScreen"), {
  loading: () => (
    <div className="h-[calc(100vh-64px)] bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

// Remove PerformanceDebug

// Lazy load map and all related components only when user clicks "Load Map"
const ClientMapWrapper = dynamic(() => import("./ClientMapWrapper"), {
  loading: () => (
    <div className="h-[calc(100vh-64px)] bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading interactive map...
        </span>
      </div>
    </div>
  ),
  ssr: false, // Map requires client-side rendering
});

// Lazy load MapLibre CSS only when map is loaded
const loadMapLibreCSS = () => {
  if (
    typeof window !== "undefined" &&
    !document.querySelector('link[href*="maplibre-gl.css"]')
  ) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css";
    document.head.appendChild(link);
  }
};

interface DynamicHomeContentProps {
  initialCoordinates?: [number, number] | null;
}

export default function DynamicHomeContent({
  initialCoordinates,
}: DynamicHomeContentProps) {
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check localStorage on mount to see if user has already loaded map
  useEffect(() => {
    const hasLoadedMap = localStorage.getItem("opinion-has-loaded-map");
    if (hasLoadedMap === "true") {
      // User has loaded map before, skip welcome screen
      loadMapLibreCSS();
      setShowMap(true);
    }
    setIsLoading(false);
  }, []);

  const handleLoadMap = () => {
    // Save preference to localStorage
    localStorage.setItem("opinion-has-loaded-map", "true");

    // Load MapLibre CSS when map is requested
    loadMapLibreCSS();
    setShowMap(true);
  };

  // Show loading while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        {showMap ? (
          <ClientMapWrapper initialCoordinates={initialCoordinates} />
        ) : (
          <WelcomeScreen onLoadMap={handleLoadMap} />
        )}
      </main>
    </div>
  );
}
