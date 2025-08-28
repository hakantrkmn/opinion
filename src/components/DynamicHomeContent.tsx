"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import heavy home page components to optimize bundle size
// Since middleware guarantees authentication, we can safely load these on demand
const Header = dynamic(() => import("./Header"), {
  loading: () => (
    <div className="h-16 bg-background border-b flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  ),
});

const ClientMapWrapper = dynamic(() => import("./ClientMapWrapper"), {
  loading: () => (
    <div className="h-[calc(100vh-64px)] bg-background flex items-center justify-center">
      <div className="flex items-center gap-2">
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

export default function DynamicHomeContent({ initialCoordinates }: DynamicHomeContentProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        <ClientMapWrapper initialCoordinates={initialCoordinates} />
      </main>
    </div>
  );
}
