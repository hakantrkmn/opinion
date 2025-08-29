import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Query parameters
    const bounds = searchParams.get("bounds");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
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
        )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply bounds filter if provided
    if (bounds) {
      const [south, west, north, east] = bounds.split(",").map(Number);
      query = query
        .gte("latitude", south)
        .lte("latitude", north)
        .gte("longitude", west)
        .lte("longitude", east);
    }

    const { data: pins, error } = await query;

    if (error) {
      console.error("Error fetching pins:", error);
      return NextResponse.json(
        { error: "Failed to fetch pins" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pins: pins || [],
      total: pins?.length || 0,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      latitude,
      longitude,
      location_name,
      category,
      is_public = true,
    } = body;

    // Validate required fields
    if (!title || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Title, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const { data: pin, error } = await supabase
      .from("pins")
      .insert({
        title,
        description,
        latitude,
        longitude,
        location_name,
        category,
        is_public,
        user_id: user.id,
      })
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
      console.error("Error creating pin:", error);
      return NextResponse.json(
        { error: "Failed to create pin" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pin }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
