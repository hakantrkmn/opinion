/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import { User } from "@supabase/supabase-js";
import { createClient } from "./client";

export const pinService = {
  // Pin oluştur (pin + ilk yorumu birlikte)
  async createPin(
    data: CreatePinData,
    user?: User
  ): Promise<{ pin: Pin | null; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
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
        .select(
          `
          id,
          user_id,
          name,
          location,
          created_at,
          updated_at,
          users!inner(display_name, avatar_url)
        `
        )
        .single();

      if (pinError) {
        console.error("Pin creation error:", pinError);
        return { pin: null, error: pinError.message };
      }

      // Handle photo upload if provided
      let photoUrl: string | undefined;

      if (data.photo) {
        try {
          const { uploadCommentPhoto } = await import("./photoService");
          const result = await uploadCommentPhoto(data.photo, user.id);

          if (result.success && result.url) {
            photoUrl = result.url;
            console.log("Photo uploaded successfully:", photoUrl);
          } else {
            console.error("Photo upload failed:", result.error);
          }
        } catch (photoError) {
          console.error("Photo upload error:", photoError);
        }
      }

      // İlk yorumu ekle (is_first_comment = true ile)
      const commentData: any = {
        pin_id: pin.id,
        user_id: user.id,
        text: data.comment,
        is_first_comment: true,
      };

      // Add photo data if available
      if (photoUrl) {
        commentData.photo_url = photoUrl;
        if (data.photoMetadata) {
          commentData.photo_metadata = data.photoMetadata;
        }
      }

      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert(commentData)
        .select("*")
        .single();

      if (commentError) {
        console.error("Comment creation error:", commentError);
        // Pin oluşturuldu ama yorum eklenemedi - pin'i sil
        await supabase.from("pins").delete().eq("id", pin.id);

        // Also clean up uploaded photo if it exists
        if (photoUrl) {
          try {
            const { deleteCommentPhoto } = await import("./photoService");
            await deleteCommentPhoto(photoUrl);
          } catch (cleanupError) {
            console.error(
              "Failed to cleanup photo after pin creation failure:",
              cleanupError
            );
          }
        }

        return { pin: null, error: "İlk yorum eklenirken hata oluştu" };
      }

      console.log("Pin ve ilk yorum başarıyla oluşturuldu:", {
        pinId: pin.id,
        commentId: comment.id,
        hasPhoto: !!photoUrl,
      });

      // Pin'i comment count ve user bilgisi ile birlikte döndür - RPC formatına uygun
      const pinWithCommentCount = {
        ...pin,
        comment_count: 1, // İlk yorum eklendi
        comments_count: 1, // Alternatif field name
        user: {
          display_name:
            pin.users?.[0]?.display_name ||
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "Anonim",
          avatar_url:
            pin.users?.[0]?.avatar_url ||
            user.user_metadata?.avatar_url ||
            null,
        },
      };

      return { pin: pinWithCommentCount, error: null };
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

  // Birden fazla pin için yorumları toplu olarak getir
  async getBatchComments(
    pinIds: string[],
    user?: User
  ): Promise<{
    comments: { [pinId: string]: Comment[] };
    error: string | null;
  }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al (optional for public viewing)
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user || undefined; // Allow undefined for public access
      }

      if (pinIds.length === 0) {
        return { comments: {}, error: null };
      }

      // Validate that pinIds is an array
      if (!Array.isArray(pinIds)) {
        console.error("pinIds must be an array");
        return { comments: {}, error: "Geçersiz pin ID listesi" };
      }
      // Tek query ile tüm pin'lerin comment'larını ve vote'larını çek
      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          pin_id,
          user_id,
          text,
          created_at,
          is_first_comment,
          photo_url,
          users:user_id(display_name, avatar_url),
          comment_votes!left(value, user_id)
        `
        )
        .in("pin_id", pinIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("getBatchComments error:", error);
        return { comments: {}, error: error.message };
      }

      console.log("✅ Fetched batch comments:", comments?.length || 0);

      // Comment'ları pin ID'ye göre grupla
      const commentsByPin: { [pinId: string]: Comment[] } = {};

      // İlk olarak tüm pin'ler için boş array'ler oluştur
      pinIds.forEach((pinId) => {
        commentsByPin[pinId] = [];
      });

      // Comment'ları işle ve grupla
      (comments || []).forEach((comment) => {
        // comment_votes array'ini al (her vote bir object)
        const votes = comment.comment_votes || [];

        // Toplam vote sayısını hesapla (sum of all vote values)
        const voteCount = votes.reduce(
          (sum: number, vote: any) => sum + (vote.value || 0),
          0
        );

        // Kullanıcının oyunu bul (sadece authenticated user için)
        const userVote =
          user && user.id
            ? votes.find((vote: any) => vote.user_id === user!.id)?.value || 0
            : 0; // Non-authenticated users have no vote

        const processedComment = {
          ...comment,
          vote_count: voteCount,
          user_vote: userVote,
          users: comment.users || {
            display_name: "Anonymous",
            avatar_url: null,
          },
        };

        // Pin ID'ye göre grupla
        if (commentsByPin[comment.pin_id]) {
          commentsByPin[comment.pin_id].push(processedComment);
        }
      });

      return { comments: commentsByPin, error: null };
    } catch (error) {
      console.error("getBatchComments error:", error);
      return { comments: {}, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },

  // Pin'in yorumlarını getir
  async getPinComments(
    pinId: string,
    user?: User
  ): Promise<{ comments: Comment[] | null; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al (optional for public viewing)
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user || undefined; // Allow undefined for public access
      }
      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          pin_id,
          user_id,
          text,
          created_at,
          is_first_comment,
          photo_url,
          users:user_id(display_name, avatar_url),
          comment_votes!left(value, user_id)
        `
        )
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("getPinComments error:", error);
        return { comments: null, error: error.message };
      }

      console.log("✅ Fetched comments with votes:", comments?.length || 0);

      // Eğer yorum yoksa boş array döndür (trigger otomatik olarak pin'i silecek)
      if (!comments || comments.length === 0) {
        console.log(
          "No comments found for pin:",
          pinId,
          "- pin will be auto-deleted by trigger"
        );
        return {
          comments: [],
          error: "PIN_AUTO_DELETED", // Özel error kodu
        };
      }

      // Comment'ları vote bilgileriyle birlikte işle
      const commentsWithVotes = (comments || []).map((comment) => {
        // comment_votes array'ini al (her vote bir object)
        const votes = comment.comment_votes || [];

        // Toplam vote sayısını hesapla (sum of all vote values)
        const voteCount = votes.reduce(
          (sum: number, vote: any) => sum + (vote.value || 0),
          0
        );

        // Kullanıcının oyunu bul (sadece authenticated user için)
        const userVote =
          user && user.id
            ? votes.find((vote: any) => vote.user_id === user!.id)?.value || 0
            : 0; // Non-authenticated users have no vote

        return {
          ...comment,
          vote_count: voteCount,
          user_vote: userVote,
          users: comment.users || {
            display_name: "Anonymous",
            avatar_url: null,
          },
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
    text: string,
    user?: User,
    photoUrl?: string,
    photoMetadata?: any
  ): Promise<{ comment: Comment | null; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
        return { comment: null, error: "Kullanıcı bulunamadı" };
      }

      // Comment data to insert
      const commentData: any = {
        pin_id: pinId,
        user_id: user.id,
        text: text,
      };

      // Add photo data if provided
      if (photoUrl) {
        commentData.photo_url = photoUrl;
        if (photoMetadata) {
          commentData.photo_metadata = photoMetadata;
        }
      }

      const { data: comment, error } = await supabase
        .from("comments")
        .insert(commentData)
        .select(
          `
          *,
          users(display_name, avatar_url)
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
    newText: string,
    user?: User,
    photoUrl?: string | null, // null means remove existing photo, undefined means don't change
    photoMetadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        text: newText,
        updated_at: new Date().toISOString(),
      };

      // Handle photo operations
      if (photoUrl !== undefined) {
        if (photoUrl === null) {
          // Remove photo
          updateData.photo_url = null;
          updateData.photo_metadata = null;
        } else {
          // Add or replace photo
          updateData.photo_url = photoUrl;
          updateData.photo_metadata = photoMetadata || {};
        }
      }
      // If photoUrl is undefined, don't change existing photo

      const { error } = await supabase
        .from("comments")
        .update(updateData)
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
    commentId: string,
    user?: User
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
        return { success: false, error: "Kullanıcı bulunamadı" };
      }

      // Önce yorumun foto bilgisini al
      const { data: comment, error: fetchError } = await supabase
        .from("comments")
        .select("photo_url")
        .eq("id", commentId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      // Eğer fotoğraf varsa önce onu sil
      if (comment?.photo_url) {
        const { deleteCommentPhoto } = await import("./photoService");
        const photoDeleted = await deleteCommentPhoto(comment.photo_url);
        if (!photoDeleted) {
          console.warn("Failed to delete comment photo:", comment.photo_url);
          // Continue with comment deletion even if photo deletion fails
        }
      }

      // Yorumu sil
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
    value: number,
    user?: User
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
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
    pinId: string,
    user?: User
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
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

      // Pin'e ait tüm yorum fotoğraflarını al
      const { data: commentsWithPhotos } = await supabase
        .from("comments")
        .select("photo_url")
        .eq("pin_id", pinId)
        .not("photo_url", "is", null);

      // Fotoğrafları sil (hata olsa bile devam et)
      if (commentsWithPhotos && commentsWithPhotos.length > 0) {
        const { deleteCommentPhoto } = await import("./photoService");
        for (const comment of commentsWithPhotos) {
          if (comment.photo_url) {
            const photoDeleted = await deleteCommentPhoto(comment.photo_url);
            if (!photoDeleted) {
              console.warn(
                "Failed to delete comment photo during pin deletion:",
                comment.photo_url
              );
            }
          }
        }
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
  async deleteCommentWithCleanup(
    commentId: string,
    user?: User
  ): Promise<{
    success: boolean;
    pinDeleted: boolean;
    error: string | null;
    pinId?: string;
  }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
        return {
          success: false,
          pinDeleted: false,
          error: "User not found",
        };
      }

      // Önce yorumun bilgilerini al (pin_id, user_id ve photo_url için)
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .select("pin_id, user_id, photo_url")
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

      // Eğer fotoğraf varsa önce onu sil
      if (comment.photo_url) {
        const { deleteCommentPhoto } = await import("./photoService");
        const photoDeleted = await deleteCommentPhoto(comment.photo_url);
        if (!photoDeleted) {
          console.warn("Failed to delete comment photo:", comment.photo_url);
          // Continue with comment deletion even if photo deletion fails
        }
      }

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

  // Check if user has already commented on a pin
  async hasUserCommented(
    pinId: string,
    user?: User
  ): Promise<{
    hasCommented: boolean;
    commentId?: string;
    error: string | null;
  }> {
    try {
      const supabase = createClient();

      // User parametre olarak gelmemişse Supabase'den al
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      }

      if (!user) {
        return { hasCommented: false, error: "Kullanıcı bulunamadı" };
      }

      const { data: existingComment, error } = await supabase
        .from("comments")
        .select("id")
        .eq("pin_id", pinId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        return { hasCommented: false, error: error.message };
      }

      return {
        hasCommented: !!existingComment,
        commentId: existingComment?.id,
        error: null,
      };
    } catch {
      return { hasCommented: false, error: "Kontrol edilirken hata oluştu" };
    }
  },
};
