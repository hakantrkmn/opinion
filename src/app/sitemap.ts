import { createClient } from "@/lib/supabase/server";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  // Temel sayfalar
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
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
      .limit(1000); // SEO için makul bir limit

    if (!error && pins) {
      pinPages = pins.map((pin) => ({
        url: `${baseUrl}/pin/${pin.id}`,
        lastModified: new Date(pin.updated_at || pin.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Sitemap pin fetch error:", error);
  }

  // Location-based sayfalar (şehir/ülke bazlı)
  const locationPages = [
    {
      url: `${baseUrl}/location/istanbul`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/location/turkey`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ];

  return [...staticPages, ...pinPages, ...locationPages];
}
