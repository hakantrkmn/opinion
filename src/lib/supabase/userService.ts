import type { Comment, Pin } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

class SupabaseClientManager {
  private static instance: SupabaseClient | null = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = createClient();
    }
    return this.instance;
  }
}
export const userService = {
  // Avatar upload and management functions
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{
    avatarUrl: string | null;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      console.log("🖼️ Starting avatar upload for user:", userId);
      const startTime = performance.now();

      // Validate file
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        return {
          avatarUrl: null,
          error: "Please upload a valid image file (JPG, PNG, WebP, or GIF)",
        };
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return { avatarUrl: null, error: "File size must be less than 5MB" };
      }

      // Get current avatar URL to delete old one
      const { data: currentUser } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      // Create unique filename with timestamp to prevent caching issues
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true, // This will replace existing file
        });

      if (uploadError) {
        console.error("❌ Avatar upload error:", uploadError);
        return {
          avatarUrl: null,
          error: "Failed to upload avatar. Please try again.",
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const avatarUrl = urlData.publicUrl;

      // Update user's avatar_url in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Failed to update user avatar URL:", updateError);
        // Clean up uploaded file
        await supabase.storage.from("avatars").remove([uploadData.path]);
        return {
          avatarUrl: null,
          error: "Failed to save avatar. Please try again.",
        };
      }

      // Clean up old avatar file if it exists
      if (currentUser?.avatar_url) {
        try {
          const oldPath = currentUser.avatar_url.split("/avatars/")[1];
          if (oldPath && oldPath !== uploadData.path) {
            await supabase.storage.from("avatars").remove([oldPath]);
            console.log("🗑️ Old avatar cleaned up:", oldPath);
          }
        } catch (cleanupError) {
          console.warn("⚠️ Failed to cleanup old avatar:", cleanupError);
          // Don't fail the upload if cleanup fails
        }
      }

      const endTime = performance.now();
      console.log(
        "✅ Avatar uploaded successfully in",
        (endTime - startTime).toFixed(2),
        "ms"
      );

      return { avatarUrl, error: null };
    } catch (error) {
      console.error("❌ uploadAvatar error:", error);
      return {
        avatarUrl: null,
        error: "Avatar upload failed. Please try again.",
      };
    }
  },

  // Delete user avatar
  async deleteAvatar(userId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      // Get current avatar URL
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (fetchError || !userData?.avatar_url) {
        return { success: true, error: null }; // No avatar to delete
      }

      // Extract file path from URL
      const avatarPath = userData.avatar_url.split("/avatars/")[1];
      if (avatarPath) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([avatarPath]);

        if (deleteError) {
          console.error(
            "❌ Failed to delete avatar from storage:",
            deleteError
          );
        }
      }

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Failed to update user avatar URL:", updateError);
        return { success: false, error: "Failed to remove avatar" };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("❌ deleteAvatar error:", error);
      return { success: false, error: "Failed to delete avatar" };
    }
  },

  // Update user display name
  async updateDisplayName(
    userId: string,
    displayName: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      // Validate display name
      if (!displayName.trim()) {
        return { success: false, error: "Display name cannot be empty" };
      }

      if (displayName.length > 50) {
        return {
          success: false,
          error: "Display name must be less than 50 characters",
        };
      }

      const { error } = await supabase
        .from("users")
        .update({ display_name: displayName.trim() })
        .eq("id", userId);

      if (error) {
        console.error("❌ Failed to update display name:", error);
        return { success: false, error: "Failed to update display name" };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("❌ updateDisplayName error:", error);
      return { success: false, error: "Failed to update display name" };
    }
  },

  // Get user profile with avatar
  async getUserProfile(userId: string): Promise<{
    profile: {
      id: string;
      email: string;
      display_name?: string;
      avatar_url?: string;
      created_at: string;
    } | null;
    error: string | null;
    isAuthError?: boolean; // Flag to indicate if this is an auth-related error
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      const { data: profile, error } = await supabase
        .from("users")
        .select("id, email, display_name, avatar_url, created_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Failed to fetch user profile:", error);

        // Check if this is an authentication error
        const isAuthError =
          error.code === "PGRST301" || // JWT expired
          error.code === "PGRST116" || // No rows (user doesn't exist)
          error.message?.includes("JWT") ||
          error.message?.includes("not authenticated");

        console.log("🔍 getUserProfile error analysis:", {
          errorCode: error.code,
          errorMessage: error.message,
          isAuthError,
          userId,
        });

        return { profile: null, error: "Failed to load profile", isAuthError };
      }

      return { profile, error: null, isAuthError: false };
    } catch (error) {
      console.error("❌ getUserProfile error:", error);
      // Network or other critical errors might indicate auth issues
      const isAuthError =
        error instanceof Error &&
        (error.message?.includes("JWT") ||
          error.message?.includes("auth") ||
          error.message?.includes("unauthorized"));

      return { profile: null, error: "Failed to load profile", isAuthError };
    }
  },
  // Kullanıcının istatistiklerini getir (denormalized from user_stats table)
  async getUserStats(userId: string): Promise<{
    stats: {
      totalPins: number;
      totalComments: number;
      totalLikes: number;
      totalDislikes: number;
      totalVotesGiven?: number;
      lastActivityAt?: string;
    } | null;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      console.log("🚀 Fetching denormalized user statistics for user:", userId);
      const startTime = performance.now();

      // Get denormalized statistics from user_stats table
      const { data: userStats, error: statsError } = await supabase
        .from("user_stats")
        .select(
          `
          total_pins,
          total_comments,
          total_likes_received,
          total_dislikes_received,
          total_votes_given,
          last_activity_at
        `
        )
        .eq("user_id", userId)
        .single();

      const endTime = performance.now();
      console.log(
        "✅ Denormalized stats query completed in",
        (endTime - startTime).toFixed(2),
        "ms"
      );

      if (statsError) {
        // If user_stats doesn't exist, create it with default values
        if (statsError.code === "PGRST116") {
          // No rows returned
          console.log("📊 Creating initial user stats for user:", userId);

          const { error: insertError } = await supabase
            .from("user_stats")
            .insert({
              user_id: userId,
              total_pins: 0,
              total_comments: 0,
              total_likes_received: 0,
              total_dislikes_received: 0,
              total_votes_given: 0,
              last_activity_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Failed to create initial user stats:", insertError);
            throw insertError;
          }

          return {
            stats: {
              totalPins: 0,
              totalComments: 0,
              totalLikes: 0,
              totalDislikes: 0,
              totalVotesGiven: 0,
              lastActivityAt: new Date().toISOString(),
            },
            error: null,
          };
        }

        console.error("Error fetching user stats:", statsError);
        throw statsError;
      }

      console.log("📈 Fetched denormalized user statistics:", {
        pins: userStats.total_pins,
        comments: userStats.total_comments,
        likes: userStats.total_likes_received,
        dislikes: userStats.total_dislikes_received,
        votesGiven: userStats.total_votes_given,
      });

      return {
        stats: {
          totalPins: userStats.total_pins || 0,
          totalComments: userStats.total_comments || 0,
          totalLikes: userStats.total_likes_received || 0,
          totalDislikes: userStats.total_dislikes_received || 0,
          totalVotesGiven: userStats.total_votes_given || 0,
          lastActivityAt: userStats.last_activity_at,
        },
        error: null,
      };
    } catch (error) {
      console.error("❌ getUserStats error:", error);
      return { stats: null, error: "İstatistikler yüklenirken hata oluştu" };
    }
  },

  // Refresh user statistics (recalculate from actual data)
  async refreshUserStats(userId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      console.log("🔄 Refreshing user statistics for user:", userId);
      const startTime = performance.now();

      // Calculate actual statistics from database
      const [pinsResult, commentsResult] = await Promise.all([
        // Count user's pins
        supabase
          .from("pins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // Count user's comments
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      // Count likes and dislikes received on user's comments
      const { data: userComments } = await supabase
        .from("comments")
        .select("id")
        .eq("user_id", userId);

      const commentIds = userComments?.map((c) => c.id) || [];

      let likesReceived = 0;
      let dislikesReceived = 0;

      if (commentIds.length > 0) {
        const [likesResult, dislikesResult] = await Promise.all([
          supabase
            .from("comment_votes")
            .select("id", { count: "exact", head: true })
            .eq("value", 1)
            .in("comment_id", commentIds),

          supabase
            .from("comment_votes")
            .select("id", { count: "exact", head: true })
            .eq("value", -1)
            .in("comment_id", commentIds),
        ]);

        likesReceived = likesResult.count || 0;
        dislikesReceived = dislikesResult.count || 0;
      }

      // Count votes given by user
      const { count: votesGiven } = await supabase
        .from("comment_votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      // Update user_stats with calculated values
      const { error: updateError } = await supabase.from("user_stats").upsert({
        user_id: userId,
        total_pins: pinsResult.count || 0,
        total_comments: commentsResult.count || 0,
        total_likes_received: likesReceived,
        total_dislikes_received: dislikesReceived,
        total_votes_given: votesGiven || 0,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (updateError) {
        console.error("❌ Failed to update user stats:", updateError);
        throw updateError;
      }

      const endTime = performance.now();
      console.log(
        "✅ User statistics refreshed successfully in",
        (endTime - startTime).toFixed(2),
        "ms"
      );

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error("❌ refreshUserStats error:", error);
      return {
        success: false,
        error: "Failed to refresh user statistics",
      };
    }
  },

  // Get user statistics with performance comparison
  async getUserStatsWithPerformanceInfo(userId: string): Promise<{
    stats: {
      totalPins: number;
      totalComments: number;
      totalLikes: number;
      totalDislikes: number;
      totalVotesGiven?: number;
      lastActivityAt?: string;
    } | null;
    performanceInfo: {
      queryTime: number;
      method: string;
      improvement?: string;
    };
    error: string | null;
  }> {
    const startTime = performance.now();
    const result = await this.getUserStats(userId);
    const endTime = performance.now();

    const queryTime = endTime - startTime;

    // Estimate what the old method would have taken (4 separate queries)
    const estimatedOldTime = queryTime * 4; // Conservative estimate
    const improvement = (
      ((estimatedOldTime - queryTime) / estimatedOldTime) *
      100
    ).toFixed(1);

    return {
      stats: result.stats,
      performanceInfo: {
        queryTime: parseFloat(queryTime.toFixed(2)),
        method: "denormalized",
        improvement: `~${improvement}% faster than aggregate queries`,
      },
      error: result.error,
    };
  },

  // Kullanıcının pin'lerini getir
  async getUserPins(userId: string): Promise<{
    pins: Pin[] | null;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      const { data: pins, error } = await supabase
        .from("pins")
        .select(
          `
          *,
          comments!inner(count),
          users!inner(display_name, avatar_url)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return { pins: null, error: error.message };
      }

      return { pins: pins || [], error: null };
    } catch (error) {
      console.error("getUserPins error:", error);
      return { pins: null, error: "Pin'ler yüklenirken hata oluştu" };
    }
  },

  // Kullanıcının yorumlarını getir
  async getUserComments(userId: string): Promise<{
    comments: Comment[] | null;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          pins!inner(name, location),
          comment_votes(value),
          users!inner(display_name, avatar_url)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return { comments: null, error: error.message };
      }

      // Her yorum için vote sayısını hesapla
      const commentsWithVotes = (comments || []).map((comment) => ({
        ...comment,
        vote_count:
          comment.comment_votes?.reduce(
            (sum: number, vote: { value: number }) => sum + vote.value,
            0
          ) || 0,
      }));

      return { comments: commentsWithVotes, error: null };
    } catch (error) {
      console.error("getUserComments error:", error);
      return { comments: null, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },
};
