import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { generateLocationSchema, generateBreadcrumbSchema, createJsonLdScript } from "@/lib/structured-data";
import { generateOGMetadata, generateTwitterMetadata, generateLocationKeywords } from "@/lib/og-utils";

// Dinamik metadata oluştur
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const locationName = decodeURIComponent(params.slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";
  
  const title = `Opinions in ${locationName} | oPINion`;
  const description = `Discover what people think about ${locationName}. Read ${locationName} opinions, reviews, and community thoughts about locations, restaurants, attractions and more.`;
  
  // Generate enhanced Open Graph metadata
  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: 'location',
    baseUrl,
  });

  // Generate Twitter metadata
  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: 'location',
    baseUrl,
  });

  // Generate location-specific keywords
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
      'og:locality': locationName,
      'geo.placename': locationName,
      'geo.region': locationName,
    },
    alternates: {
      canonical: `/location/${encodeURIComponent(locationName)}`,
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: { slug: string };
}) {
  const locationName = decodeURIComponent(params.slug);
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  // Bu location'daki pin'leri çek
  const { data: pins, error } = await supabase
    .from("pins")
    .select(
      `
      *,
      users:user_id(display_name, avatar_url)
    `
    )
    .ilike("location", `%${locationName}%`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Location page error:", error);
  }

  // Generate structured data
  const locationSchema = generateLocationSchema(locationName, pins || [], { baseUrl });
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: "Locations", url: "/locations" },
      { name: locationName, url: `/location/${encodeURIComponent(locationName)}` },
    ],
    { baseUrl }
  );

  const totalPins = pins?.length || 0;
  const hasContent = totalPins > 0;

  return (
    <>
      {/* Structured Data */}
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
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/locations" className="hover:text-blue-600">Locations</Link>
            <span className="mx-2">/</span>
            <span>{locationName}</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
              📍 Opinions in {locationName}
            </h1>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
              <p className="text-gray-700 text-lg mb-4">
                Discover what people think about locations in {locationName}. Read
                community opinions, reviews, and experiences shared by real visitors.
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                  📊 {totalPins} {totalPins === 1 ? 'opinion' : 'opinions'} shared
                </div>
                {hasContent && (
                  <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                    🌟 Community insights available
                  </div>
                )}
              </div>
            </div>
          </header>

          {hasContent ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">
                  Recent Opinions ({totalPins})
                </h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pins!.map((pin) => (
                  <article 
                    key={pin.id} 
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <header className="mb-3">
                      <h3 className="text-xl font-semibold mb-2">
                        <a 
                          href={`/pin/${pin.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {pin.title || "Untitled Pin"}
                        </a>
                      </h3>
                    </header>

                    {pin.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {pin.description}
                      </p>
                    )}

                    <div className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                      📍 {pin.location}
                    </div>

                    <footer className="flex justify-between items-center text-sm">
                      {pin.users && (
                        <div className="flex items-center gap-2 text-gray-600">
                          {pin.users.avatar_url && (
                            <img 
                              src={pin.users.avatar_url} 
                              alt={pin.users.display_name}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span>By {pin.users.display_name}</span>
                        </div>
                      )}
                      
                      <time className="text-gray-400">
                        {new Date(pin.created_at).toLocaleDateString()}
                      </time>
                    </footer>
                  </article>
                ))}
              </div>
              
              {/* Call to Action */}
              <div className="mt-12 text-center bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">
                  Share Your Experience in {locationName}
                </h3>
                <p className="text-gray-600 mb-6">
                  Have you visited {locationName}? Share your thoughts and help others discover great places!
                </p>
                <Link 
                  href="/"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your Opinion
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-2xl font-semibold mb-4">
                No opinions yet in {locationName}
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Be the first to share your thoughts about locations in {locationName}! 
                Your opinion could help others discover amazing places.
              </p>
              <Link 
                href="/"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                🌟 Be the First to Share
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
