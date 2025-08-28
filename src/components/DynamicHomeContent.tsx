"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Import MapLibre CSS only when this component loads
import "maplibre-gl/dist/maplibre-gl.css";

// Dynamically import heavy home page components to optimize bundle size
// Since middleware guarantees authentication, we can safely load these on demand
const Header = dynamic(() => import("./Header"), {
  loading: () => (
    <div className="h-16 bg-background border-b flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  ),
});

// Super aggressive map loading - only when user interacts
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

interface DynamicHomeContentProps {
  initialCoordinates?: [number, number] | null;
}

export default function DynamicHomeContent({
  initialCoordinates,
}: DynamicHomeContentProps) {
  const [loadMap, setLoadMap] = useState(false);
  const [forceLoadMap, setForceLoadMap] = useState(false);

  // Load map after a delay or user interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadMap(true);
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        {loadMap || forceLoadMap ? (
          <ClientMapWrapper initialCoordinates={initialCoordinates} />
        ) : (
          <div className="h-full bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">
                Preparing interactive map...
              </span>
              <button
                onClick={() => setForceLoadMap(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
              >
                Load Map Now
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
