"use client";
import DynamicHomeContent from "@/components/map/DynamicHomeContent";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function HomeContent() {
  const { isLoading } = useSession();
  const searchParams = useSearchParams();

  // Parse latitude and longitude from URL query parameters
  const initialCoordinates = useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("long") || searchParams.get("lng");

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      // Validate coordinates
      if (
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        console.log("Valid coordinates from URL:", { latitude, longitude });
        return [longitude, latitude] as [number, number]; // [lng, lat] format for maplibre
      } else {
        console.warn("Invalid coordinates in URL:", { lat, lng });
      }
    }

    return null;
  }, [searchParams]);

  // Artık herkes ana sayfaya erişebilir - auth/non-auth fark etmez
  // RLS policies database seviyesinde koruma sağlıyor
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

  // Hem authenticated hem non-authenticated kullanıcılar için content yükle
  return <DynamicHomeContent initialCoordinates={initialCoordinates} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
