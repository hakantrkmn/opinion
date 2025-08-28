import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { generatePlaceSchema, generateBreadcrumbSchema, createJsonLdScript } from "@/lib/structured-data";
import { generateOGMetadata, generateTwitterMetadata, generateGeoMetadata, generateLocationKeywords } from "@/lib/og-utils";

// Dinamik metadata oluştur
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const { data: pin } = await supabase
    .from("pins")
    .select("title, description, location, created_at, latitude, longitude")
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();

  if (!pin) {
    return {
      title: "Pin Not Found",
      description: "The requested pin could not be found.",
    };
  }

  const title = pin.title || "Pin Details";
  const description = pin.description || `View details about ${pin.location} on oPINion map.`;
  
  // Generate enhanced Open Graph metadata
  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: pin.location,
    type: 'pin',
    baseUrl,
  });

  // Generate Twitter metadata
  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: pin.location,
    type: 'pin',
    baseUrl,
  });

  // Generate geo metadata
  const geoMetadata = generateGeoMetadata(pin.latitude, pin.longitude, pin.location);

  // Generate location-specific keywords
  const locationKeywords = generateLocationKeywords(pin.location);

  return {
    title,
    description,
    keywords: [
      "opinion",
      "pin",
      "location",
      "review",
      "thoughts",
      pin.location,
      ...locationKeywords,
    ],
    openGraph: {
      ...ogMetadata,
      url: `/pin/${params.id}`,
      publishedTime: pin.created_at,
      authors: ['oPINion Community'],
    },
    twitter: twitterMetadata,
    other: {
      ...geoMetadata,
      'article:author': 'oPINion Community',
      'article:published_time': pin.created_at,
      'og:locality': pin.location,
    },
    alternates: {
      canonical: `/pin/${params.id}`,
    },
  };
}

export default async function PinPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const { data: pin, error } = await supabase
    .from("pins")
    .select(
      `
      *,
      users:user_id(display_name, avatar_url),
      comments(*)
    `
    )
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();

  if (error || !pin) {
    notFound();
  }

  // Generate structured data
  const placeSchema = generatePlaceSchema(pin, { baseUrl });
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: "Pins", url: "/pins" },
      { name: pin.title || "Pin Details", url: `/pin/${pin.id}` },
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
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span className="mx-2">/</span>
            <span>Pin Details</span>
          </nav>

          <article>
            <header className="mb-6">
              <h1 className="text-3xl font-bold mb-4">
                {pin.title || "Untitled Pin"}
              </h1>

              {pin.description && (
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                  {pin.description}
                </p>
              )}
            </header>

            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-2">📍 Location</h2>
              <p className="text-gray-700">{pin.location}</p>
              {pin.latitude && pin.longitude && (
                <p className="text-sm text-gray-500 mt-1">
                  Coordinates: {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {pin.users && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">👤 Posted by</h2>
                <div className="flex items-center gap-3">
                  {pin.users.avatar_url && (
                    <img 
                      src={pin.users.avatar_url} 
                      alt={pin.users.display_name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <span className="text-gray-700 font-medium">{pin.users.display_name}</span>
                </div>
              </div>
            )}

            {pin.comments && pin.comments.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">💬 Comments ({pin.comments.length})</h2>
                <div className="space-y-3">
                  {pin.comments.slice(0, 3).map((comment: { id: string; content: string; created_at: string }) => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-700">{comment.content}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
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
                <span>Created: {new Date(pin.created_at).toLocaleDateString()}</span>
                {pin.updated_at && pin.updated_at !== pin.created_at && (
                  <span>Updated: {new Date(pin.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
