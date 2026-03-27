import {
  generateLocationKeywords,
  generateOGMetadata,
  generateTwitterMetadata,
} from "@/lib/og-utils";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generateLocationSchema,
} from "@/lib/structured-data";
import { db } from "@/db";
import { pins } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, ilike, desc } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locationName = decodeURIComponent(slug);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const title = `Opinions in ${locationName} | oPINion`;
  const description = `Discover what people think about ${locationName}. Read ${locationName} opinions, reviews, and community thoughts about locations, restaurants, attractions and more.`;

  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "location",
    baseUrl,
  });

  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "location",
    baseUrl,
  });

  const locationKeywords = generateLocationKeywords(locationName);

  return {
    title,
    description,
    keywords: [
      "opinions",
      "reviews",
      "location",
      "community",
      "thoughts",
      "experiences",
      locationName,
      ...locationKeywords,
    ],
    openGraph: {
      ...ogMetadata,
      url: `/location/${encodeURIComponent(locationName)}`,
    },
    twitter: twitterMetadata,
    other: {
      "og:locality": locationName,
      "geo.placename": locationName,
      "geo.region": locationName,
    },
    alternates: {
      canonical: `/location/${encodeURIComponent(locationName)}`,
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locationName = decodeURIComponent(slug);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  // Search pins by name containing the location
  const locationPins = await db
    .select({
      id: pins.id,
      name: pins.name,
      location: pins.location,
      createdAt: pins.createdAt,
      userId: pins.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(pins)
    .leftJoin(user, eq(pins.userId, user.id))
    .where(ilike(pins.name, `%${locationName}%`))
    .orderBy(desc(pins.createdAt))
    .limit(50);

  const locationSchema = generateLocationSchema(
    locationName,
    locationPins.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
      created_at: p.createdAt.toISOString(),
    })),
    { baseUrl }
  );
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: "Locations", url: "/locations" },
      {
        name: locationName,
        url: `/location/${encodeURIComponent(locationName)}`,
      },
    ],
    { baseUrl }
  );

  const totalPins = locationPins.length;
  const hasContent = totalPins > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(locationSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(breadcrumbSchema)}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>{locationName}</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Opinions in {locationName}
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover what people think about locations in {locationName}.
            </p>
          </header>

          {hasContent ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locationPins.map((pin) => (
                <article
                  key={pin.id}
                  className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border"
                >
                  <h3 className="text-xl font-semibold mb-2">
                    <Link
                      href={`/pin/${pin.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {pin.name}
                    </Link>
                  </h3>
                  <footer className="flex justify-between items-center text-sm mt-4">
                    {pin.displayName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {pin.avatarUrl && (
                          <img
                            src={pin.avatarUrl}
                            alt={pin.displayName}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <span>By {pin.displayName}</span>
                      </div>
                    )}
                    <time className="text-muted-foreground">
                      {new Date(pin.createdAt).toLocaleDateString()}
                    </time>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">
                No opinions yet in {locationName}
              </h2>
              <p className="text-muted-foreground mb-8">
                Be the first to share your thoughts!
              </p>
              <Link
                href="/"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Share Your Opinion
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
