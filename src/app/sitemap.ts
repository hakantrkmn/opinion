import { db } from "@/db";
import { pins } from "@/db/schema/app";
import { desc } from "drizzle-orm";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/auth`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  let pinPages: MetadataRoute.Sitemap = [];

  try {
    const allPins = await db
      .select({
        id: pins.id,
        createdAt: pins.createdAt,
        updatedAt: pins.updatedAt,
        name: pins.name,
      })
      .from(pins)
      .orderBy(desc(pins.createdAt))
      .limit(2000);

    pinPages = allPins.map((pin) => {
      const lastModified = new Date(pin.updatedAt || pin.createdAt);
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(pin.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      let priority = 0.7;
      if (daysSinceCreation < 7) priority = 0.9;
      else if (daysSinceCreation < 30) priority = 0.8;
      else if (daysSinceCreation < 90) priority = 0.7;
      else priority = 0.6;

      let changeFrequency: "daily" | "weekly" | "monthly" | "yearly" =
        "weekly";
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
  } catch (error) {
    console.error("Sitemap pin fetch error:", error);
  }

  return [...staticPages, ...pinPages];
}
