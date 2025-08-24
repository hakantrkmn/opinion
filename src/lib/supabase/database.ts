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

      // Pin oluştur (PostGIS formatında)
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

      // İlk yorumu ekle
      const { error: commentError } = await supabase.from("comments").insert({
        pin_id: pin.id,
        user_id: user.id,
        text: data.comment,
        is_first_comment: true,
      });

      if (commentError) {
        console.error("Comment creation error:", commentError);
        return { pin: null, error: commentError.message };
      }

      return { pin, error: null };
    } catch (error) {
      console.error("createPin error:", error);
      return { pin: null, error: "Pin oluşturulurken hata oluştu" };
    }
  },

  // Harita alanındaki pin'leri getir
  async getPins(
    bounds: MapBounds
  ): Promise<{ pins: Pin[] | null; error: string | null }> {
    try {
      const supabase = createClient();

      console.log("Getting pins for bounds:", bounds);

      // Önce tüm pin'leri getir (bounds filtresi olmadan)
      const { data: pins, error } = await supabase
        .from("pins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("getPins error:", error);
        return { pins: null, error: error.message };
      }

      console.log("Found pins:", pins);

      // Client-side'da bounds filtresi uygula
      const filteredPins = (pins || []).filter((pin) => {
        if (!pin.location) {
          console.warn("Pin without location:", pin);
          return false;
        }

        const [lng, lat] = parseLocation(pin.location);
        console.log("Pin bounds check:", pin.name, [lng, lat], bounds);

        const isInBounds =
          lat >= bounds.minLat &&
          lat <= bounds.maxLat &&
          lng >= bounds.minLng &&
          lng <= bounds.maxLng;

        console.log("Is in bounds:", isInBounds);
        return isInBounds;
      });

      // Her pin için user bilgisini ve comment count'u getir
      const pinsWithDetails = await Promise.all(
        filteredPins.map(async (pin) => {
          // User bilgisini getir
          const { data: user } = await supabase
            .from("users")
            .select("display_name")
            .eq("id", pin.user_id)
            .single();

          // Comment count'u getir
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("pin_id", pin.id);

          return {
            ...pin,
            user: user || { display_name: "Unknown" },
            comments_count: count || 0,
          };
        })
      );

      return { pins: pinsWithDetails, error: null };
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

      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          users!inner(display_name)
        `
        )
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("getPinComments error:", error);
        return { comments: null, error: error.message };
      }

      console.log("Fetched comments:", comments);

      // Her yorum için vote bilgilerini getir
      const commentsWithVotes = await Promise.all(
        (comments || []).map(async (comment) => {
          try {
            // Toplam vote sayısını getir
            const { data: votes } = await supabase
              .from("comment_votes")
              .select("value")
              .eq("comment_id", comment.id);

            // Kullanıcının oyunu getir
            const {
              data: { user },
            } = await supabase.auth.getUser();
            let userVote = 0;

            if (user) {
              const { data: userVoteData } = await supabase
                .from("comment_votes")
                .select("value")
                .eq("comment_id", comment.id)
                .eq("user_id", user.id)
                .maybeSingle();

              userVote = userVoteData?.value || 0;
            }

            // Vote sayısını hesapla
            const voteCount =
              votes?.reduce((sum, vote) => sum + vote.value, 0) || 0;

            return {
              ...comment,
              vote_count: voteCount,
              user_vote: userVote,
            };
          } catch (voteError) {
            console.warn(
              "Vote fetch error for comment:",
              comment.id,
              voteError
            );
            return {
              ...comment,
              vote_count: 0,
              user_vote: 0,
            };
          }
        })
      );

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      return { success: false, error: "Pin silinirken hata oluştu" };
    }
  },
};

// PostGIS location'dan koordinatları çıkar (GeoJSON formatı)
const parseLocation = (location: any): [number, number] => {
  if (!location) {
    console.warn("Invalid location:", location);
    return [0, 0];
  }

  // GeoJSON formatı kontrol et
  if (location.type === "Point" && location.coordinates) {
    const [lng, lat] = location.coordinates;
    console.log("Parsed coordinates from DB:", [lng, lat]);
    return [lng, lat];
  }

  // String formatı kontrol et (eski format)
  if (typeof location === "string") {
    const match = location.match(/POINT\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(" ").map(Number);
      return [lng, lat];
    }
  }

  console.warn("Could not parse location:", location);
  return [0, 0];
};
