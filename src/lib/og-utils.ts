/**
 * Utility functions for generating Open Graph images
 */

export interface OGImageConfig {
  title: string;
  description?: string;
  location?: string;
  type?: 'pin' | 'location' | 'default';
  baseUrl: string;
}

/**
 * Generate Open Graph image URL for dynamic content
 * This can be extended to use a service like Vercel OG or custom image generation
 */
export function generateOGImageUrl(config: OGImageConfig): string {
  const params = new URLSearchParams({
    title: config.title,
    type: config.type || 'default',
  });

  if (config.description) {
    params.append('description', config.description.substring(0, 100));
  }

  if (config.location) {
    params.append('location', config.location);
  }

  return `${config.baseUrl}/api/og?${params.toString()}`;
}

/**
 * Generate fallback Open Graph image based on content type
 */
export function getFallbackOGImage(type: 'pin' | 'location' | 'default', baseUrl: string): string {
  const images = {
    pin: `${baseUrl}/og-pin-default.png`,
    location: `${baseUrl}/og-location-default.png`,
    default: `${baseUrl}/og-default.png`,
  };

  return images[type] || images.default;
}

/**
 * Generate comprehensive Open Graph metadata
 */
export function generateOGMetadata(config: OGImageConfig) {
  const ogImage = generateOGImageUrl(config);
  const fallbackImage = getFallbackOGImage(config.type || 'default', config.baseUrl);

  return {
    title: config.title,
    description: config.description || `Discover opinions on oPINion map`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: config.title,
      },
      {
        url: fallbackImage,
        width: 1200,
        height: 630,
        alt: config.title,
      },
    ],
    type: config.type === 'pin' ? 'article' : 'website',
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterMetadata(config: OGImageConfig) {
  const ogImage = generateOGImageUrl(config);

  return {
    card: 'summary_large_image' as const,
    title: config.title,
    description: config.description || `Discover opinions on oPINion map`,
    images: [ogImage],
    creator: '@opinion_map',
  };
}

/**
 * Generate geographic metadata for local SEO
 */
export function generateGeoMetadata(latitude?: number, longitude?: number, location?: string) {
  const geo: Record<string, string> = {};

  if (latitude && longitude) {
    geo['geo.position'] = `${latitude};${longitude}`;
    geo['ICBM'] = `${latitude}, ${longitude}`;
  }

  if (location) {
    geo['geo.placename'] = location;
    geo['geo.region'] = location;
  }

  return geo;
}

/**
 * Generate location-specific keywords for SEO
 */
export function generateLocationKeywords(location: string): string[] {
  const baseKeywords = [
    'opinion',
    'review',
    'thoughts',
    'community',
    'map',
    'location',
    'feedback',
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