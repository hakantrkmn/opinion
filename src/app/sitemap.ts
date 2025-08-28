import { createClient } from "@/lib/supabase/server";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  // Temel sayfalar - High priority pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  // Pin'leri veritabanından çek
  let pinPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    const { data: pins, error } = await supabase
      .from("pins")
      .select("id, created_at, updated_at, title, location")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(2000); // Increased limit for better SEO coverage

    if (!error && pins) {
      pinPages = pins.map((pin) => {
        const lastModified = new Date(pin.updated_at || pin.created_at);
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(pin.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Dynamic priority based on recency and content
        let priority = 0.7;
        if (daysSinceCreation < 7) priority = 0.9; // Recent pins get higher priority
        else if (daysSinceCreation < 30) priority = 0.8;
        else if (daysSinceCreation < 90) priority = 0.7;
        else priority = 0.6;

        // Dynamic change frequency based on age
        let changeFrequency: "daily" | "weekly" | "monthly" | "yearly" = "weekly";
        if (daysSinceCreation < 7) changeFrequency = "daily";
        else if (daysSinceCreation < 30) changeFrequency = "weekly";
        else if (daysSinceCreation < 180) changeFrequency = "monthly";
        else changeFrequency = "yearly";

        return {
          url: `${baseUrl}/pin/${pin.id}`,
          lastModified,
          changeFrequency,
          priority,
        };
      });
    }
  } catch (error) {
    console.error("Sitemap pin fetch error:", error);
  }

  // Location-based sayfalar - Enhanced with dynamic locations
  let locationPages: MetadataRoute.Sitemap = [];
  
  try {
    const supabase = await createClient();
    
    // Get unique locations from pins for dynamic location pages
    const { data: locations, error: locationError } = await supabase
      .from("pins")
      .select("location")
      .eq("is_deleted", false)
      .not("location", "is", null);

    if (!locationError && locations) {
      // Extract unique cities/locations
      const uniqueLocations = [...new Set(
        locations
          .map(item => item.location)
          .filter(location => location && location.length > 2)
          .map(location => {
            // Extract city name (assuming format like "City, Country" or just "City")
            const parts = location.split(',');
            return parts[0].trim();
          })
      )].slice(0, 100); // Limit to top 100 locations

      locationPages = uniqueLocations.map(location => ({
        url: `${baseUrl}/location/${encodeURIComponent(location)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Sitemap location fetch error:", error);
  }

  // Add some predefined important location pages
  const predefinedLocations = [
    "istanbul",
    "turkey",
    "london",
    "new-york",
    "paris",
    "tokyo",
  ];

  const predefinedLocationPages: MetadataRoute.Sitemap = predefinedLocations.map(location => ({
    url: `${baseUrl}/location/${location}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages, 
    ...pinPages, 
    ...locationPages,
    ...predefinedLocationPages
  ];
}
