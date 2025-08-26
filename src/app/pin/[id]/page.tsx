import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// Dinamik metadata oluştur
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();

  const { data: pin } = await supabase
    .from("pins")
    .select("title, description, location, created_at")
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();

  if (!pin) {
    return {
      title: "Pin Not Found",
      description: "The requested pin could not be found.",
    };
  }

  return {
    title: pin.title || "Pin Details",
    description:
      pin.description || `View details about this location on oPINion map.`,
    openGraph: {
      title: pin.title || "Pin Details",
      description:
        pin.description || `View details about this location on oPINion map.`,
      type: "article",
      publishedTime: pin.created_at,
    },
    twitter: {
      card: "summary",
      title: pin.title || "Pin Details",
      description:
        pin.description || `View details about this location on oPINion map.`,
    },
  };
}

export default async function PinPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          {pin.title || "Untitled Pin"}
        </h1>

        {pin.description && (
          <p className="text-gray-600 mb-6">{pin.description}</p>
        )}

        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Location</h2>
          <p className="text-gray-700">{pin.location}</p>
        </div>

        {pin.users && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Posted by</h2>
            <p className="text-gray-700">{pin.users.display_name}</p>
          </div>
        )}

        <div className="text-sm text-gray-500">
          Created: {new Date(pin.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
