import {
  generateLocationKeywords,
  generateOGMetadata,
  generateTwitterMetadata,
} from "@/lib/og-utils";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generatePlaceSchema,
} from "@/lib/structured-data";
import { db } from "@/db";
import { pins, comments } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, asc } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const [pin] = await db
    .select({
      id: pins.id,
      name: pins.name,
      location: pins.location,
      createdAt: pins.createdAt,
      updatedAt: pins.updatedAt,
    })
    .from(pins)
    .where(eq(pins.id, id));

  if (!pin) {
    return {
      title: "Pin Not Found | oPINion",
      description: "The requested pin could not be found.",
    };
  }

  const title = pin.name || "Pin Details";
  const description = `Discover opinions and thoughts about ${pin.name}. Read what the community thinks about this location on oPINion.`;
  const locationName = pin.name || "Unknown Location";

  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
  });

  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
  });

  const locationKeywords = generateLocationKeywords(locationName);

  return {
    title,
    description,
    keywords: [
      "opinion",
      "pin",
      "location",
      "review",
      "thoughts",
      locationName,
      ...locationKeywords,
    ],
    openGraph: {
      ...ogMetadata,
      url: `/pin/${id}`,
      publishedTime: pin.createdAt.toISOString(),
      authors: ["oPINion Community"],
    },
    twitter: twitterMetadata,
    other: {
      "geo.placename": locationName,
      "geo.region": locationName,
      "article:author": "oPINion Community",
      "article:published_time": pin.createdAt.toISOString(),
      "og:locality": locationName,
    },
    alternates: {
      canonical: `/pin/${id}`,
    },
  };
}

export default async function PinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const [pin] = await db
    .select({
      id: pins.id,
      name: pins.name,
      location: pins.location,
      createdAt: pins.createdAt,
      updatedAt: pins.updatedAt,
      userId: pins.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(pins)
    .leftJoin(user, eq(pins.userId, user.id))
    .where(eq(pins.id, id));

  if (!pin) {
    notFound();
  }

  const pinComments = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      isFirstComment: comments.isFirstComment,
      photoUrl: comments.photoUrl,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.pinId, id))
    .orderBy(asc(comments.createdAt));

  // Build pin-like object for structured data
  const pinData = {
    id: pin.id,
    name: pin.name,
    location: pin.location,
    created_at: pin.createdAt.toISOString(),
    updated_at: pin.updatedAt.toISOString(),
  };

  const placeSchema = generatePlaceSchema(pinData, { baseUrl });
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: "Pins", url: "/pins" },
      { name: pin.name || "Pin Details", url: `/pin/${id}` },
    ],
    { baseUrl }
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(placeSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(breadcrumbSchema)}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Pin Details</span>
          </nav>

          <article>
            <header className="mb-6">
              <h1 className="text-3xl font-bold mb-4">
                {pin.name || "Untitled Pin"}
              </h1>
            </header>

            <div className="bg-muted p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-2">Location</h2>
              <p className="text-foreground">{pin.name || "Unknown Location"}</p>
            </div>

            {pin.displayName && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Posted by</h2>
                <div className="flex items-center gap-3">
                  {pin.avatarUrl && (
                    <img
                      src={pin.avatarUrl}
                      alt={pin.displayName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className="text-foreground font-medium">
                    {pin.displayName}
                  </span>
                </div>
              </div>
            )}

            {pinComments.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">
                  Comments ({pinComments.length})
                </h2>
                <div className="space-y-3">
                  {pinComments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className="bg-muted/50 p-3 rounded">
                      <p className="text-foreground">{comment.text}</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {pinComments.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      + {pinComments.length - 3} more comments
                    </p>
                  )}
                </div>
              </div>
            )}

            <footer className="text-sm text-muted-foreground border-t pt-4">
              <div className="flex justify-between items-center">
                <span>
                  Created:{" "}
                  {new Date(pin.createdAt).toLocaleDateString()}
                </span>
                {pin.updatedAt.toISOString() !== pin.createdAt.toISOString() && (
                  <span>
                    Updated:{" "}
                    {new Date(pin.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
