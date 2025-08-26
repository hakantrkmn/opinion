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

  // Get analytics (optimized with denormalized data)
  async getAnalytics() {
    const supabase = createAdminClient();

    console.log("📊 Fetching admin analytics with denormalized data...");
    const startTime = performance.now();

    // Get counts using efficient queries
    const [usersResult, pinsResult, commentsResult, statsResult] =
      await Promise.all([
        supabase.auth.admin.listUsers(),
        supabase.from("pins").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        // Get aggregated statistics from user_stats table
        supabase.from("user_stats").select(`
          total_pins,
          total_comments,
          total_likes_received,
          total_dislikes_received,
          total_votes_given,
          last_activity_at
        `),
      ]);

    // Calculate totals from denormalized data
    const totalPinsFromStats =
      statsResult.data?.reduce(
        (sum, stat) => sum + (stat.total_pins || 0),
        0
      ) || 0;
    const totalCommentsFromStats =
      statsResult.data?.reduce(
        (sum, stat) => sum + (stat.total_comments || 0),
        0
      ) || 0;
    const totalLikes =
      statsResult.data?.reduce(
        (sum, stat) => sum + (stat.total_likes_received || 0),
        0
      ) || 0;
    const totalDislikes =
      statsResult.data?.reduce(
        (sum, stat) => sum + (stat.total_dislikes_received || 0),
        0
      ) || 0;
    const totalVotes =
      statsResult.data?.reduce(
        (sum, stat) => sum + (stat.total_votes_given || 0),
        0
      ) || 0;

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

    // Get most active users from denormalized stats
    const { data: topUsers } = await supabase
      .from("user_stats")
      .select(
        `
        user_id,
        total_pins,
        total_comments,
        total_likes_received,
        last_activity_at,
        users!inner(email)
      `
      )
      .order("total_pins", { ascending: false })
      .limit(5);

    const endTime = performance.now();
    const queryTime = (endTime - startTime).toFixed(2);

    console.log(
      "✅ Admin analytics loaded in",
      queryTime,
      "ms with denormalized data"
    );
    console.log("📈 Statistics comparison:", {
      pinsFromCount: pinsResult.count,
      pinsFromStats: totalPinsFromStats,
      commentsFromCount: commentsResult.count,
      commentsFromStats: totalCommentsFromStats,
    });

    return {
      totalUsers: usersResult.data.users.length,
      totalPins: pinsResult.count || 0,
      totalComments: commentsResult.count || 0,
      totalLikes,
      totalDislikes,
      totalVotes,
      recentPins: recentPins || [],
      recentComments: recentComments || [],
      topUsers: topUsers || [],
      performanceInfo: {
        queryTime: parseFloat(queryTime),
        method: "denormalized",
        statsAccuracy: {
          pinsMatch: (pinsResult.count || 0) === totalPinsFromStats,
          commentsMatch: (commentsResult.count || 0) === totalCommentsFromStats,
        },
      },
    };
  },

  // Refresh all user statistics (admin only)
  async refreshAllUserStats() {
    const supabase = createAdminClient();

    console.log("🔄 Refreshing all user statistics...");
    const startTime = performance.now();

    try {
      // Call the database function to populate all user stats
      const { error } = await supabase.rpc("populate_user_stats");

      if (error) {
        console.error("❌ Failed to refresh all user stats:", error);
        throw error;
      }

      const endTime = performance.now();
      console.log(
        "✅ All user statistics refreshed in",
        (endTime - startTime).toFixed(2),
        "ms"
      );

      return { success: true, error: null };
    } catch (error) {
      console.error("❌ refreshAllUserStats error:", error);
      return { success: false, error: "Failed to refresh user statistics" };
    }
  },

  // Get user statistics summary for admin dashboard
  async getUserStatsSummary() {
    const supabase = createAdminClient();

    try {
      const { data: summary } = await supabase.from("user_stats").select(`
          total_pins,
          total_comments,
          total_likes_received,
          total_dislikes_received,
          total_votes_given,
          last_activity_at
        `);

      if (!summary) return null;

      // Calculate aggregated statistics
      const stats = summary.reduce(
        (acc, userStat) => ({
          totalUsers: acc.totalUsers + 1,
          totalPins: acc.totalPins + (userStat.total_pins || 0),
          totalComments: acc.totalComments + (userStat.total_comments || 0),
          totalLikes: acc.totalLikes + (userStat.total_likes_received || 0),
          totalDislikes:
            acc.totalDislikes + (userStat.total_dislikes_received || 0),
          totalVotes: acc.totalVotes + (userStat.total_votes_given || 0),
          lastActivity:
            userStat.last_activity_at > acc.lastActivity
              ? userStat.last_activity_at
              : acc.lastActivity,
        }),
        {
          totalUsers: 0,
          totalPins: 0,
          totalComments: 0,
          totalLikes: 0,
          totalDislikes: 0,
          totalVotes: 0,
          lastActivity: "1970-01-01T00:00:00.000Z",
        }
      );

      return stats;
    } catch (error) {
      console.error("❌ getUserStatsSummary error:", error);
      return null;
    }
  },
};
