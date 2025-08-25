/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import { createClient } from "./client";

export const pinService = {
  // Pin oluştur (pin + ilk yorumu birlikte)
  async createPin(
    data: CreatePinData
  ): Promise<{ pin: Pin | null; error: string | null }> {
    try {
      const supabase = createClient();

      // Kullanıcı bilgisini al
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { pin: null, error: "Kullanıcı bulunamadı" };
      }

      console.log("Creating pin with data:", data);

      // Transaction ile hem pin hem de ilk yorumu oluştur
      const { data: pin, error: pinError } = await supabase
        .from("pins")
        .insert({
          user_id: user.id,
          name: data.pinName,
          location: `POINT(${data.lng} ${data.lat})`, // PostGIS formatı
        })
        .select("*")
        .single();

      if (pinError) {
        console.error("Pin creation error:", pinError);
        return { pin: null, error: pinError.message };
      }

      // İlk yorumu ekle (is_first_comment = true ile)
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          pin_id: pin.id,
          user_id: user.id,
          text: data.comment,
          is_first_comment: true,
        })
        .select("*")
        .single();

      if (commentError) {
        console.error("Comment creation error:", commentError);
        // Pin oluşturuldu ama yorum eklenemedi - pin'i sil
        await supabase.from("pins").delete().eq("id", pin.id);
        return { pin: null, error: "İlk yorum eklenirken hata oluştu" };
      }

      console.log("Pin ve ilk yorum başarıyla oluşturuldu:", {
        pinId: pin.id,
        commentId: comment.id,
      });

      return { pin, error: null };
    } catch (error) {
      console.error("createPin error:", error);
      return { pin: null, error: "Pin oluşturulurken hata oluştu" };
    }
  },

  // Harita alanındaki pin'leri getir (OPTIMIZED)
  async getPins(
    bounds: MapBounds
  ): Promise<{ pins: Pin[] | null; error: string | null }> {
    try {
      const supabase = createClient();

      console.log("Getting pins for bounds:", bounds);

      // RPC function'ı çağır
      const { data: pins, error } = await supabase.rpc("get_pins_in_bounds", {
        min_lat: bounds.minLat,
        max_lat: bounds.maxLat,
        min_lng: bounds.minLng,
        max_lng: bounds.maxLng,
      });

      if (error) {
        console.error("getPins error:", error);
        return { pins: null, error: error.message };
      }

      // Pin'leri doğru formata çevir
      const formattedPins: Pin[] = (pins || []).map((pin: any) => ({
        id: pin.id,
        user_id: pin.user_id,
        name: pin.name,
        location: pin.location,
        created_at: pin.created_at,
        updated_at: pin.updated_at,
        user: { display_name: pin.user_display_name },
        comments_count: pin.comments_count,
      }));

      return { pins: formattedPins, error: null };
    } catch (error) {
      console.error("getPins error:", error);
      return { pins: null, error: "Pin'ler yüklenirken hata oluştu" };
    }
  },

  // Pin'in yorumlarını getir
  async getPinComments(
    pinId: string
  ): Promise<{ comments: Comment[] | null; error: string | null }> {
    try {
      const supabase = createClient();

      // Kullanıcı bilgisini al
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not authenticated:", userError);
        return { comments: null, error: "Kullanıcı bulunamadı" };
      }

      // Tek query ile comment'ları ve vote'ları birlikte çek
      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          users!inner(display_name),
          comment_votes!left(value, user_id)
        `
        )
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("getPinComments error:", error);
        return { comments: null, error: error.message };
      }

      console.log("Fetched comments with votes:", comments);

      // Comment'ları vote bilgileriyle birlikte işle
      const commentsWithVotes = (comments || []).map((comment) => {
        // comment_votes array'ini al (her vote bir object)
        const votes = comment.comment_votes || [];

        // Toplam vote sayısını hesapla (sum of all vote values)
        const voteCount = votes.reduce(
          (sum: number, vote: any) => sum + (vote.value || 0),
          0
        );

        // Kullanıcının oyunu bul
        const userVote =
          votes.find((vote: any) => vote.user_id === user.id)?.value || 0;

        return {
          ...comment,
          vote_count: voteCount,
          user_vote: userVote,
          // comment_votes array'ini koru - component'ta sayıları hesaplamak için gerekli
          // comment_votes: undefined,
        };
      });

      return { comments: commentsWithVotes, error: null };
    } catch (error) {
      console.error("getPinComments error:", error);
      return { comments: null, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },

  // Pin'e yeni yorum ekle
  async addComment(
    pinId: string,
    text: string
  ): Promise<{ comment: Comment | null; error: string | null }> {
    try {
      const supabase = createClient();

      // Kullanıcı bilgisini al
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { comment: null, error: "Kullanıcı bulunamadı" };
      }

      const { data: comment, error } = await supabase
        .from("comments")
        .insert({
          pin_id: pinId,
          user_id: user.id,
          text: text,
        })
        .select(
          `
          *,
          users(display_name)
        `
        )
        .single();

      if (error) {
        return { comment: null, error: error.message };
      }

      return { comment, error: null };
    } catch {
      return { comment: null, error: "Yorum eklenirken hata oluştu" };
    }
  },

  // Yorum düzenleme
  async updateComment(
    commentId: string,
    newText: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      const { error } = await supabase
        .from("comments")
        .update({ text: newText, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("user_id", user.id); // Sadece kendi yorumunu düzenleyebilir

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Yorum güncellenirken hata oluştu" };
    }
  },

  // Yorum silme
  async deleteComment(
    commentId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Sadece kendi yorumunu silebilir

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Yorum silinirken hata oluştu" };
    }
  },

  // Yorum oylama
  async voteComment(
    commentId: string,
    value: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      console.log(
        "Voting on comment:",
        commentId,
        "value:",
        value,
        "user:",
        user.id
      );

      // Önce mevcut oyu kontrol et
      const { data: existingVote, error: checkError } = await supabase
        .from("comment_votes")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("Existing vote:", existingVote, "check error:", checkError);

      if (existingVote) {
        // Mevcut oyu güncelle
        const { error } = await supabase
          .from("comment_votes")
          .update({ value })
          .eq("id", existingVote.id);

        console.log("Update vote error:", error);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Yeni oy ekle
        const { error } = await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: user.id,
          value,
        });

        console.log("Insert vote error:", error);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("voteComment error:", error);
      return { success: false, error: "Oy verilirken hata oluştu" };
    }
  },

  // Pin'i sil (sadece pin sahibi silebilir)
  async deletePin(
    pinId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      // Kullanıcı bilgisini al
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      // Pin'in sahibi mi kontrol et
      const { data: pin, error: pinError } = await supabase
        .from("pins")
        .select("user_id")
        .eq("id", pinId)
        .single();

      if (pinError || pin.user_id !== user.id) {
        return { success: false, error: "Bu pin'i silme yetkiniz yok" };
      }

      // Pin'i sil (cascade ile yorumlar da silinir)
      const { error: deleteError } = await supabase
        .from("pins")
        .delete()
        .eq("id", pinId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Pin silinirken hata oluştu" };
    }
  },

  // Yorum silme ve otomatik pin temizleme (database trigger handles pin cleanup)
  async deleteCommentWithCleanup(commentId: string): Promise<{
    success: boolean;
    pinDeleted: boolean;
    error: string | null;
    pinId?: string;
  }> {
    try {
      const supabase = createClient();

      // Kullanıcı bilgisini al
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          pinDeleted: false,
          error: "User not found",
        };
      }

      // Önce yorumun bilgilerini al (pin_id ve user_id kontrolü için)
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .select("pin_id, user_id")
        .eq("id", commentId)
        .single();

      if (commentError || !comment) {
        return {
          success: false,
          pinDeleted: false,
          error: "Comment not found",
        };
      }

      // Kullanıcının kendi yorumu mu kontrol et
      if (comment.user_id !== user.id) {
        return {
          success: false,
          pinDeleted: false,
          error: "You can only delete your own comments",
        };
      }

      const pinId = comment.pin_id;

      // Yorumu silmeden önce bu pin'de kaç yorum olduğunu kontrol et
      const { data: commentsBefore, error: countBeforeError } = await supabase
        .from("comments")
        .select("id", { count: "exact" })
        .eq("pin_id", pinId);

      if (countBeforeError) {
        console.error(
          "Error counting comments before deletion:",
          countBeforeError
        );
      }

      const commentCountBefore = commentsBefore?.length || 0;

      // Yorumu sil - database trigger otomatik olarak pin'i silecek eğer son yorumsa
      const { error: deleteError } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Ekstra güvenlik kontrolü

      if (deleteError) {
        return {
          success: false,
          pinDeleted: false,
          error: deleteError.message,
        };
      }

      // Eğer bu son yorumdu, pin otomatik olarak silinmiş olmalı
      const wasLastComment = commentCountBefore === 1;

      if (wasLastComment) {
        // Pin'in gerçekten silinip silinmediğini kontrol et
        const { data: pinExists, error: pinCheckError } = await supabase
          .from("pins")
          .select("id")
          .eq("id", pinId)
          .maybeSingle();

        if (pinCheckError) {
          console.error("Error checking if pin exists:", pinCheckError);
        }

        const pinWasDeleted = !pinExists;

        return {
          success: true,
          pinDeleted: pinWasDeleted,
          error: null,
          pinId,
        };
      }

      return {
        success: true,
        pinDeleted: false,
        error: null,
        pinId,
      };
    } catch (error) {
      console.error("deleteCommentWithCleanup error:", error);
      return {
        success: false,
        pinDeleted: false,
        error: "An error occurred while deleting comment",
      };
    }
  },
};
