import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        // Longest match wins: /api/og (share-card images, fetched by Google
        // and by link-preview bots that honour robots.txt) beats /api/.
        allow: ["/", "/api/og"],
        // Only the JSON API is blocked. Account, invite and community pages
        // stay crawlable so crawlers can read their noindex (X-Robots-Tag in
        // next.config.ts); a "Disallow: /u" would also block /uploads.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
