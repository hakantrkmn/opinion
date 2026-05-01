import { db } from "@/db";
import { pins } from "@/db/schema/app";
import { getBaseUrl } from "@/lib/site-url";
import { desc } from "drizzle-orm";
import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
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
    console.error(
      "[sitemap] Failed to fetch pins for sitemap, returning static pages only:",
      error
    );
  }

  return [...staticPages, ...pinPages];
}
