import type { PinPageComment, PinPageData } from "@/server/services/pins/pages";

export interface StructuredDataConfig {
  baseUrl: string;
}

/** Stable node ids so the site-wide schemas can reference each other. */
export const orgId = (baseUrl: string) => `${baseUrl}/#organization`;
export const siteId = (baseUrl: string) => `${baseUrl}/#website`;

/**
 * Organization schema for the whole site. The logo is a square PNG, which
 * Google needs for the logo rich result (it does not take SVG here).
 */
export function generateOrganizationSchema({ baseUrl }: StructuredDataConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(baseUrl),
    name: "droPINion",
    description:
      "Interactive map platform where you can share opinions and discover what others think about different locations around the world.",
    url: `${baseUrl}/`,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/logo-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: ["https://twitter.com/opinion_map"],
  };
}

/**
 * WebSite schema for the home page: gives Google the site name for search
 * results. No SearchAction: Google retired the sitelinks search box.
 */
export function generateWebSiteSchema({ baseUrl }: StructuredDataConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteId(baseUrl),
    name: "droPINion",
    alternateName: "dropinion",
    url: `${baseUrl}/`,
    publisher: { "@id": orgId(baseUrl) },
  };
}

/**
 * Plain Place schema for a pin, used only when the pin has no visible
 * opinion to describe it as a discussion.
 *
 * No Review / AggregateRating anywhere: droPINion has like / dislike votes,
 * not star ratings, and Google's review-snippet policy forbids made-up ones.
 */
export function generatePlaceSchema(
  pin: { id: string; name?: string; latitude?: number; longitude?: number; hasMap?: string },
  { baseUrl }: StructuredDataConfig
) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: pin.name,
    url: `${baseUrl}/pin/${pin.id}`,
  };
  if (Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)) {
    schema.geo = { "@type": "GeoCoordinates", latitude: pin.latitude, longitude: pin.longitude };
  }
  if (pin.hasMap) schema.hasMap = pin.hasMap;
  return schema;
}

/**
 * A pin page is a forum-style thread: the opening opinion plus replies, all
 * about one place. DiscussionForumPosting is Google's documented type for
 * user-generated discussion pages.
 */
export function generatePinDiscussionSchema(
  pin: PinPageData,
  comments: PinPageComment[],
  { baseUrl, mapUrl }: StructuredDataConfig & { mapUrl: string },
  fallbackName: string
): Record<string, unknown> | null {
  const op = comments.find((c) => c.isFirstComment) ?? comments[0];
  if (!op) return null;
  const rest = comments.filter((c) => c.id !== op.id);
  const pageUrl = `${baseUrl}/pin/${pin.id}`;
  const absolute = (url: string | null) =>
    !url ? undefined : /^https?:\/\//.test(url) ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  // Profiles are noindex, so no author.url.
  const person = (name: string | null) => ({ "@type": "Person", name: name || fallbackName });
  const votes = (c: PinPageComment) => [
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: c.likeCount,
    },
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/DislikeAction",
      userInteractionCount: c.dislikeCount,
    },
  ];
  const opImage = absolute(op.photoUrl);

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${pageUrl}#post`,
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    headline: pin.name || fallbackName,
    text: op.text,
    ...(opImage && { image: opImage }),
    author: person(op.displayName),
    datePublished: op.createdAt.toISOString(),
    dateModified: pin.updatedAt.toISOString(),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: Math.max(0, pin.commentsCount - 1),
      },
      ...votes(op),
    ],
    about: {
      "@type": "Place",
      name: pin.name,
      geo: { "@type": "GeoCoordinates", latitude: pin.lat, longitude: pin.lng },
      hasMap: `${baseUrl}${mapUrl}`,
    },
    comment: rest.map((c) => {
      const image = absolute(c.photoUrl);
      return {
        "@type": "Comment",
        "@id": `${pageUrl}#c-${c.id}`,
        url: `${pageUrl}#c-${c.id}`,
        text: c.text,
        datePublished: c.createdAt.toISOString(),
        author: person(c.displayName),
        ...(image && { image }),
        interactionStatistic: votes(c),
      };
    }),
  };
}

/**
 * BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>,
  { baseUrl }: StructuredDataConfig
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    })),
  };
}

/**
 * /location/[slug] is a name search over pins, not a real place, so it is
 * described as a collection page listing those pins.
 */
export function generateLocationListSchema(
  title: string,
  locationName: string,
  pins: Array<{ id: string; name: string }>,
  { baseUrl }: StructuredDataConfig
) {
  const url = `${baseUrl}/location/${encodeURIComponent(locationName)}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: title,
    isPartOf: { "@id": siteId(baseUrl) },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pins.length,
      itemListElement: pins.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${baseUrl}/pin/${p.id}`,
        name: p.name,
      })),
    },
  };
}

/**
 * JSON for an inline <script type="application/ld+json">. Pin names and
 * comments are user text: escaping <, > and & keeps a "</script>" in them
 * from closing the tag, and the result is still valid JSON.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function createJsonLdScript(data: Record<string, unknown>) {
  return { __html: serializeJsonLd(data) };
}
