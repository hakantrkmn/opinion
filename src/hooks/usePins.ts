import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// Singleton cache instance
const cacheManager = new HybridCacheManager();

export const usePins = () => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pin oluştur - Cache ile
  const createPin = useCallback(
    async (data: CreatePinData): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { pin, error: pinError } = await pinService.createPin(data);

        if (pinError) {
          setError(pinError);
          return false;
        }

        if (pin) {
          // Cache'e ekle
          cacheManager.cachePin(pin);

          // Yeni pin'i listeye ekle
          setPins((prevPins) => [pin, ...prevPins]);
          return true;
        }

        return false;
      } catch (err) {
        setError("Pin oluşturulurken beklenmeyen hata oluştu");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Pin'leri yükle (harita alanına göre) - Cache ile
  const loadPins = useCallback(async (bounds: MapBounds, zoom: number = 12) => {
    setLoading(true);
    setError(null);

    try {
      // Önce cache'den kontrol et
      const cachedPins = cacheManager.getPinsForBounds(bounds, zoom);

      if (cachedPins) {
        console.log("🎯 Cache hit - returning cached pins:", cachedPins.length);
        setPins(cachedPins);
        setLoading(false);
        return { pins: cachedPins, error: null };
      }

      console.log("💾 Cache miss - fetching from API");
      const { pins: fetchedPins, error: pinsError } = await pinService.getPins(
        bounds
      );

      if (pinsError) {
        setError(pinsError);
        return;
      }

      const pins = fetchedPins || [];
      console.log("📡 Fetched pins from API:", pins.length);

      // Cache'e kaydet
      cacheManager.cachePinsFromBounds(bounds, zoom, pins);

      setPins(pins);
      return { pins, error: null };
    } catch (error) {
      console.error("loadPins error:", error);
      setError("Pin'ler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pin'in yorumlarını getir
  const getPinComments = useCallback(
    async (pinId: string): Promise<Comment[] | null> => {
      try {
        const { comments, error: commentsError } =
          await pinService.getPinComments(pinId);

        if (commentsError) {
          setError(commentsError);
          return null;
        }

        return comments;
      } catch (err) {
        setError("Yorumlar yüklenirken beklenmeyen hata oluştu");
        return null;
      }
    },
    []
  );

  // Pin'e yorum ekle - artık loading yapmıyor
  const addComment = useCallback(
    async (pinId: string, text: string): Promise<boolean> => {
      try {
        const { comment, error: commentError } = await pinService.addComment(
          pinId,
          text
        );

        if (commentError) {
          console.error("addComment error:", commentError);
          return false;
        }

        if (comment) {
          // Pin'in yorum sayısını güncelle
          setPins((prevPins) =>
            prevPins.map((pin) =>
              pin.id === pinId
                ? { ...pin, comments_count: (pin.comments_count || 0) + 1 }
                : pin
            )
          );
          return true;
        }

        return false;
      } catch (err) {
        console.error("addComment error:", err);
        return false;
      }
    },
    []
  );

  // Pin'i sil
  const deletePin = useCallback(async (pinId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { success, error: deleteError } = await pinService.deletePin(pinId);

      if (deleteError) {
        setError(deleteError);
        return false;
      }

      if (success) {
        // Pin'i listeden kaldır
        setPins((prevPins) => prevPins.filter((pin) => pin.id !== pinId));
        return true;
      }

      return false;
    } catch (err) {
      setError("Pin silinirken beklenmeyen hata oluştu");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Pin'i güncelle (local state)
  const updatePin = useCallback((pinId: string, updates: Partial<Pin>) => {
    setPins((prevPins) =>
      prevPins.map((pin) => (pin.id === pinId ? { ...pin, ...updates } : pin))
    );
  }, []);

  // Hata temizle
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Pin'leri temizle
  const clearPins = useCallback(() => {
    setPins([]);
  }, []);

  // Yorum düzenleme
  const editComment = useCallback(
    async (commentId: string, newText: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { success, error: editError } = await pinService.updateComment(
          commentId,
          newText
        );

        if (editError) {
          setError(editError);
          return false;
        }

        return success;
      } catch (error) {
        console.error("editComment error:", error);
        setError("Yorum düzenlenirken hata oluştu");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Yorum silme with cleanup
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const {
          success,
          pinDeleted,
          error: deleteError,
          pinId,
        } = await pinService.deleteCommentWithCleanup(commentId);

        if (deleteError) {
          setError(deleteError);
          toast.error("Failed to delete comment", {
            description: deleteError,
            duration: 4000,
          });
          return false;
        }

        if (success) {
          // If pin was deleted, remove it from the pins list
          if (pinDeleted && pinId) {
            setPins((prevPins) => prevPins.filter((pin) => pin.id !== pinId));
            console.log(
              "Pin automatically deleted after last comment removal:",
              pinId
            );

            // Show success notification for pin deletion
            toast.success("Pin deleted", {
              description:
                "The pin was automatically removed after deleting the last comment.",
              duration: 4000,
            });
          } else if (pinId) {
            // Just update the comment count for the pin
            setPins((prevPins) =>
              prevPins.map((pin) =>
                pin.id === pinId
                  ? {
                      ...pin,
                      comments_count: Math.max(
                        0,
                        (pin.comments_count || 1) - 1
                      ),
                    }
                  : pin
              )
            );

            // Show success notification for comment deletion
            toast.success("Comment deleted successfully");
          }
        }

        return success;
      } catch (error) {
        console.error("deleteComment error:", error);
        setError("Comment deletion failed");
        toast.error("Comment deletion failed", {
          description:
            "An unexpected error occurred while deleting the comment.",
          duration: 4000,
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Yorum oylama - artık loading yapmıyor
  const voteComment = useCallback(
    async (commentId: string, value: number): Promise<boolean> => {
      try {
        const { success, error: voteError } = await pinService.voteComment(
          commentId,
          value
        );

        if (voteError) {
          console.error("voteComment error:", voteError);
          return false;
        }

        return success;
      } catch (error) {
        console.error("voteComment error:", error);
        return false;
      }
    },
    []
  );

  return {
    // State
    pins,
    loading,
    error,

    // Actions
    createPin,
    loadPins,
    getPinComments,
    addComment,
    deletePin,
    updatePin,
    editComment,
    deleteComment,
    voteComment,

    // Utilities
    clearError,
    clearPins,
  };
};
