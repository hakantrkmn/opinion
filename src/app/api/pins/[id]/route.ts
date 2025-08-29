import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: pin, error } = await supabase
      .from("pins")
      .select(
        `
        id,
        title,
        description,
        latitude,
        longitude,
        created_at,
        updated_at,
        user_id,
        location_name,
        category,
        is_public,
        like_count,
        comment_count,
        profiles!pins_user_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        pin_photos (
          id,
          photo_url,
          caption,
          created_at
        )
      `
      )
      .eq("id", id)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Pin not found" }, { status: 404 });
      }
      console.error("Error fetching pin:", error);
      return NextResponse.json(
        { error: "Failed to fetch pin" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pin });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, location_name, category, is_public } = body;

    // Check if user owns the pin
    const { data: existingPin, error: fetchError } = await supabase
      .from("pins")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingPin) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    if (existingPin.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: pin, error } = await supabase
      .from("pins")
      .update({
        title,
        description,
        location_name,
        category,
        is_public,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id,
        title,
        description,
        latitude,
        longitude,
        created_at,
        updated_at,
        user_id,
        location_name,
        category,
        is_public,
        like_count,
        comment_count,
        profiles!pins_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating pin:", error);
      return NextResponse.json(
        { error: "Failed to update pin" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pin });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the pin
    const { data: existingPin, error: fetchError } = await supabase
      .from("pins")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingPin) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    if (existingPin.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("pins").delete().eq("id", id);

    if (error) {
      console.error("Error deleting pin:", error);
      return NextResponse.json(
        { error: "Failed to delete pin" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
