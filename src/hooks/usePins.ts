import { pinService } from "@/lib/supabase/database";
import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import { useCallback, useState } from "react";

export const usePins = () => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pin oluştur
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

  // Pin'leri yükle (harita alanına göre)
  const loadPins = useCallback(async (bounds: MapBounds) => {
    setLoading(true);
    setError(null);

    try {
      const { pins: fetchedPins, error: pinsError } = await pinService.getPins(
        bounds
      );

      if (pinsError) {
        setError(pinsError);
        return;
      }

      console.log("Fetched pins:", fetchedPins?.length); // Debug için
      setPins(fetchedPins || []); // Burada set ediliyor
      return { pins: fetchedPins || [], error: null };
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

  // Pin'e yorum ekle
  const addComment = useCallback(
    async (pinId: string, text: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { comment, error: commentError } = await pinService.addComment(
          pinId,
          text
        );

        if (commentError) {
          setError(commentError);
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
        setError("Yorum eklenirken beklenmeyen hata oluştu");
        return false;
      } finally {
        setLoading(false);
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

  // Yorum silme
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { success, error: deleteError } = await pinService.deleteComment(
          commentId
        );

        if (deleteError) {
          setError(deleteError);
          return false;
        }

        return success;
      } catch (error) {
        console.error("deleteComment error:", error);
        setError("Yorum silinirken hata oluştu");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Yorum oylama
  const voteComment = useCallback(
    async (commentId: string, value: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { success, error: voteError } = await pinService.voteComment(
          commentId,
          value
        );

        if (voteError) {
          setError(voteError);
          return false;
        }

        return success;
      } catch (error) {
        console.error("voteComment error:", error);
        setError("Oy verilirken hata oluştu");
        return false;
      } finally {
        setLoading(false);
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
