export interface StructuredDataConfig {
  baseUrl: string;
}

interface PinData {
  id: string;
  name?: string; // Changed from title to name
  description?: string;
  location: string | { type: string; coordinates: [number, number] }; // Can be string or GeoJSON
  latitude?: number;
  longitude?: number;
  comments?: CommentData[];
  users?: {
    display_name?: string;
  }[];
}

interface CommentData {
  id: string;
  text: string; // Changed from content to text
  created_at: string;
  upvotes?: number;
  downvotes?: number;
  users?: {
    display_name?: string;
  }[];
  pins?: PinData;
}

interface LocationData {
  id: string;
  title?: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Generate Organization schema for the main site
 */
export function generateOrganizationSchema(config: StructuredDataConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "oPINion",
    description:
      "Interactive map platform where you can share opinions and discover what others think about different locations around the world.",
    url: config.baseUrl,
    logo: `${config.baseUrl}/logo.png`,
    sameAs: ["https://twitter.com/opinion_map"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Turkish"],
    },
  };
}

/**
 * Generate Place/LocalBusiness schema for pin locations
 */
export function generatePlaceSchema(
  pin: PinData,
  config: StructuredDataConfig
) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: pin.name || "Location Pin",
    description: pin.description || `Opinion shared about ${pin.location}`,
    url: `${config.baseUrl}/pin/${pin.id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: pin.location,
    },
  };

  // Add geographic coordinates if available
  if (pin.latitude && pin.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: pin.latitude,
      longitude: pin.longitude,
    };
  }

  // Add aggregated rating if there are comments with votes
  if (pin.comments && pin.comments.length > 0) {
    const totalVotes = pin.comments.reduce(
      (sum: number, comment: CommentData) => {
        return sum + (comment.upvotes || 0) - (comment.downvotes || 0);
      },
      0
    );

    if (totalVotes > 0) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.max(
          1,
          Math.min(5, totalVotes / pin.comments.length + 3)
        ),
        reviewCount: pin.comments.length,
        bestRating: 5,
        worstRating: 1,
      };
    }
  }

  return schema;
}

/**
 * Generate Review schema for comments
 */
export function generateReviewSchema(
  comment: CommentData,
  config: StructuredDataConfig
) {
  const rating = Math.max(
    1,
    Math.min(5, (comment.upvotes || 0) - (comment.downvotes || 0) + 3)
  );

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    reviewBody: comment.text,
    datePublished: comment.created_at,
    author: {
      "@type": "Person",
      name: comment.users?.[0]?.display_name || "Anonymous User",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: rating,
      bestRating: 5,
      worstRating: 1,
    },
    itemReviewed: comment.pins
      ? {
          "@type": "Place",
          name: comment.pins.name || "Location",
          address: {
            "@type": "PostalAddress",
            addressLocality: comment.pins.location,
          },
        }
      : undefined,
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>,
  config: StructuredDataConfig
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${config.baseUrl}${crumb.url}`,
    })),
  };
}

/**
 * Generate LocalBusiness schema for location pages
 */
export function generateLocationSchema(
  locationName: string,
  pins: LocationData[],
  config: StructuredDataConfig
) {
  // Calculate average coordinates from pins if available
  const pinsWithCoords = pins.filter((pin) => pin.latitude && pin.longitude);
  let avgLat, avgLng;

  if (pinsWithCoords.length > 0) {
    avgLat =
      pinsWithCoords.reduce((sum, pin) => sum + pin.latitude!, 0) /
      pinsWithCoords.length;
    avgLng =
      pinsWithCoords.reduce((sum, pin) => sum + pin.longitude!, 0) /
      pinsWithCoords.length;
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: locationName,
    description: `Discover opinions and reviews about ${locationName}. Community-shared thoughts and experiences.`,
    url: `${config.baseUrl}/location/${encodeURIComponent(locationName)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: locationName,
    },
  };

  // Add coordinates if available
  if (avgLat && avgLng) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: avgLat,
      longitude: avgLng,
    };
  }

  // Add aggregate rating based on all pins in location
  if (pins.length > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: 4,
      reviewCount: pins.length,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/**
 * Utility to create JSON-LD script tag content
 */
export function createJsonLdScript(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data, null, 0),
  };
}

/**
 * Utility to render JSON-LD script tag (for use in JSX components)
 */
export function renderJsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: createJsonLdScript(data),
  };
}
