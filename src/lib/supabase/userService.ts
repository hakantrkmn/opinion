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
  // Kullanıcının istatistiklerini getir
  async getUserStats(userId: string): Promise<{
    stats: {
      totalPins: number;
      totalComments: number;
      totalLikes: number;
      totalDislikes: number;
    } | null;
    error: string | null;
  }> {
    try {
      const supabase = SupabaseClientManager.getInstance();

      // Pin sayısı
      const { count: pinCount } = await supabase
        .from("pins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Yorum sayısı
      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Kullanıcının aldığı oylar
      const { data: votes } = await supabase
        .from("comment_votes")
        .select("value")
        .eq("user_id", userId);

      // Like ve dislike sayısını hesapla
      const totalLikes = votes?.filter((vote) => vote.value === 1).length || 0;
      const totalDislikes =
        votes?.filter((vote) => vote.value === -1).length || 0;

      return {
        stats: {
          totalPins: pinCount || 0,
          totalComments: commentCount || 0,
          totalLikes: totalLikes,
          totalDislikes: totalDislikes,
        },
        error: null,
      };
    } catch (error) {
      console.error("getUserStats error:", error);
      return { stats: null, error: "İstatistikler yüklenirken hata oluştu" };
    }
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
          comments!inner(count)
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
          comment_votes(value)
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
