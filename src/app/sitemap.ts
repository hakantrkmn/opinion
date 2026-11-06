import { PRIVACY_LAST_UPDATED } from "@/lib/legal";
import { getBaseUrl } from "@/lib/site-url";
import { getSitemapPins } from "@/server/services/pins/pages";
import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Newest pins only: keeps the sitemap small and the query an index scan. */
const SITEMAP_MAX_PINS = 5000;

/**
 * Google ignores changefreq / priority and only trusts lastmod when it is
 * accurate, so pages without a real modification time get none.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticPages: MetadataRoute.Sitemap = [
    // Same spelling as the home page's canonical (no trailing slash).
    { url: baseUrl },
    { url: `${baseUrl}/explore` },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(`${PRIVACY_LAST_UPDATED}T12:00:00Z`),
    },
  ];

  let pinPages: MetadataRoute.Sitemap = [];

  try {
    const pins = await getSitemapPins(SITEMAP_MAX_PINS);
    pinPages = pins.map((pin) => ({
      url: `${baseUrl}/pin/${pin.id}`,
      lastModified: pin.lastModified,
    }));
  } catch (error) {
    console.error(
      "[sitemap] Failed to fetch pins for sitemap, returning static pages only:",
      error
    );
  }

  return [...staticPages, ...pinPages];
}
