import { createClient } from "@supabase/supabase-js";

// Admin client with service role key - bypasses RLS
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Admin functions
export const adminService = {
  // Get all users
  async getAllUsers() {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers();
    return { data: data.users, error };
  },

  // Get all pins with user info
  async getAllPins() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pins")
      .select(
        `
        *,
        profiles:user_id (
          id,
          email,
          created_at
        )
      `
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get all comments with user and pin info
  async getAllComments() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        profiles:user_id (
          id,
          email,
          created_at
        ),
        pins:pin_id (
          id,
          name,
          location
        )
      `
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Delete pin
  async deletePin(pinId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("pins").delete().eq("id", pinId);

    return { error };
  },

  // Delete comment
  async deleteComment(commentId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    return { error };
  },

  // Delete user (from auth)
  async deleteUser(userId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    return { error };
  },

  // Get analytics
  async getAnalytics() {
    const supabase = createAdminClient();

    // Get counts
    const [usersResult, pinsResult, commentsResult] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from("pins").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
    ]);

    // Get recent activity
    const { data: recentPins } = await supabase
      .from("pins")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: recentComments } = await supabase
      .from("comments")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      totalUsers: usersResult.data.users.length,
      totalPins: pinsResult.count || 0,
      totalComments: commentsResult.count || 0,
      recentPins: recentPins || [],
      recentComments: recentComments || [],
    };
  },
};
