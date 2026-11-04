/**
 * Utility functions for generating Open Graph images
 */

export interface OGImageConfig {
  title: string;
  description?: string;
  location?: string;
  type?: "pin" | "location" | "default";
  baseUrl: string;
  /** A specific preview image (e.g. /api/og/pin/:id) instead of /api/og. */
  imageUrl?: string;
}

/**
 * Open Graph image URL. /api/og renders fixed copy per type (plus a
 * location name that has pins); title / description are not sent to it.
 */
export function generateOGImageUrl(config: OGImageConfig): string {
  if (config.imageUrl) return config.imageUrl;
  const params = new URLSearchParams({ type: config.type || "default" });
  if (config.location && config.type === "location") {
    params.append("location", config.location);
  }
  return `${config.baseUrl}/api/og?${params.toString()}`;
}

/**
 * Generate comprehensive Open Graph metadata
 */
export function generateOGMetadata(config: OGImageConfig) {
  const ogImage = generateOGImageUrl(config);

  return {
    title: config.title,
    description: config.description || `Discover opinions on droPINion map`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: config.title,
      },
    ],
    type: config.type === "pin" ? "article" : "website",
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterMetadata(config: OGImageConfig) {
  const ogImage = generateOGImageUrl(config);

  return {
    card: "summary_large_image" as const,
    title: config.title,
    description: config.description || `Discover opinions on droPINion map`,
    images: [ogImage],
    creator: "@opinion_map",
  };
}

/**
 * Generate geographic metadata for local SEO
 */
export function generateGeoMetadata(
  latitude?: number,
  longitude?: number,
  location?: string
) {
  const geo: Record<string, string> = {};

  if (latitude && longitude) {
    geo["geo.position"] = `${latitude};${longitude}`;
    geo["ICBM"] = `${latitude}, ${longitude}`;
  }

  if (location) {
    geo["geo.placename"] = location;
    geo["geo.region"] = location;
  }

  return geo;
}

/**
 * Generate location-specific keywords for SEO
 */
export function generateLocationKeywords(location: string): string[] {
  const baseKeywords = [
    "opinion",
    "review",
    "thoughts",
    "community",
    "map",
    "location",
    "feedback",
  ];

  const locationKeywords = [
    `${location} opinions`,
    `${location} reviews`,
    `${location} thoughts`,
    `${location} community`,
    `${location} feedback`,
    `what people think about ${location}`,
    `${location} experiences`,
  ];

  return [...baseKeywords, ...locationKeywords];
}
