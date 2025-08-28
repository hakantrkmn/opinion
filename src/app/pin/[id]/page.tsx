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
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Dinamik metadata oluştur
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  // Query pin data for metadata generation
  const { data: pin, error } = await supabase
    .from("pins")
    .select("id, name, location, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !pin) {
    console.error("Metadata query error:", error, "for pin ID:", id);
    return {
      title: "Pin Not Found | oPINion",
      description: "The requested pin could not be found.",
    };
  }

  const title = pin.name || "Pin Details";
  const description = `Discover opinions and thoughts about ${pin.name}. Read what the community thinks about this location on oPINion.`;

  // Use the pin name as location for now (coordinates will be handled separately)
  const locationName = pin.name || "Unknown Location";

  // Generate enhanced Open Graph metadata
  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
  });

  // Generate Twitter metadata
  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
  });

  // Generate geo metadata (without coordinates for now)
  const geoMetadata = {
    "geo.placename": locationName,
    "geo.region": locationName,
  };

  // Generate location-specific keywords
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
      publishedTime: pin.created_at,
      authors: ["oPINion Community"],
    },
    twitter: twitterMetadata,
    other: {
      ...geoMetadata,
      "article:author": "oPINion Community",
      "article:published_time": pin.created_at,
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
  const supabase = await createClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const { data: pin, error } = await supabase
    .from("pins")
    .select(
      `
      id,
      name,
      location,
      created_at,
      updated_at,
      user_id,
      users:user_id(display_name, avatar_url),
      comments(
        id,
        text,
        created_at,
        is_first_comment,
        photo_url,
        users:user_id(display_name, avatar_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !pin) {
    notFound();
  }

  // Handle users data - could be single object or array depending on Supabase response
  const userData = pin.users
    ? Array.isArray(pin.users)
      ? pin.users[0]
      : pin.users
    : null;

  // Generate structured data
  const placeSchema = generatePlaceSchema(pin, { baseUrl });
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
      {/* Structured Data */}
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
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">
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

            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-2">📍 Location</h2>
              <p className="text-gray-700">{pin.name || "Unknown Location"}</p>
              {/* Coordinates display removed temporarily due to PostGIS complexity */}
            </div>

            {userData && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">👤 Posted by</h2>
                <div className="flex items-center gap-3">
                  {userData.avatar_url && (
                    <img
                      src={userData.avatar_url}
                      alt={userData.display_name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <span className="text-gray-700 font-medium">
                    {userData.display_name}
                  </span>
                </div>
              </div>
            )}

            {pin.comments && pin.comments.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">
                  💬 Comments ({pin.comments.length})
                </h2>
                <div className="space-y-3">
                  {pin.comments
                    .slice(0, 3)
                    .map(
                      (comment: {
                        id: string;
                        text: string;
                        created_at: string;
                      }) => (
                        <div
                          key={comment.id}
                          className="bg-gray-50 p-3 rounded"
                        >
                          <p className="text-gray-700">{comment.text}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )
                    )}
                  {pin.comments.length > 3 && (
                    <p className="text-sm text-gray-600">
                      + {pin.comments.length - 3} more comments
                    </p>
                  )}
                </div>
              </div>
            )}

            <footer className="text-sm text-gray-500 border-t pt-4">
              <div className="flex justify-between items-center">
                <span>
                  Created: {new Date(pin.created_at).toLocaleDateString()}
                </span>
                {pin.updated_at && pin.updated_at !== pin.created_at && (
                  <span>
                    Updated: {new Date(pin.updated_at).toLocaleDateString()}
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
