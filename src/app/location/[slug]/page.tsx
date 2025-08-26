import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

// Dinamik metadata oluştur
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const locationName = decodeURIComponent(params.slug);

  return {
    title: `Opinions in ${locationName} | oPINion`,
    description: `Discover what people think about ${locationName}. Read opinions, reviews, and thoughts about locations in ${locationName}.`,
    openGraph: {
      title: `Opinions in ${locationName} | oPINion`,
      description: `Discover what people think about ${locationName}. Read opinions, reviews, and thoughts about locations in ${locationName}.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Opinions in ${locationName} | oPINion`,
      description: `Discover what people think about ${locationName}. Read opinions, reviews, and thoughts about locations in ${locationName}.`,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Opinions in {locationName}</h1>

        <p className="text-gray-600 mb-8">
          Discover what people think about locations in {locationName}. Read
          opinions, reviews, and thoughts from the community.
        </p>

        {pins && pins.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pins.map((pin) => (
              <div key={pin.id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-2">
                  {pin.title || "Untitled Pin"}
                </h2>

                {pin.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {pin.description}
                  </p>
                )}

                <div className="text-sm text-gray-500 mb-4">{pin.location}</div>

                {pin.users && (
                  <div className="text-sm text-gray-600">
                    By {pin.users.display_name}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {new Date(pin.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">
              No opinions yet in {locationName}
            </h2>
            <p className="text-gray-600">
              Be the first to share your thoughts about this location!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
