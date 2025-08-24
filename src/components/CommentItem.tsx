"use client";

import type { Comment } from "@/types";
import { useEffect, useState } from "react";

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onEdit: (commentId: string, newText: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  onVote: (commentId: string, value: number) => Promise<boolean>;
}

export default function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onVote,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  // Local state for optimistic updates
  const [localVote, setLocalVote] = useState(comment.user_vote || 0);

  // Başlangıçta comment'dan like/dislike sayılarını hesapla
  const getLikeDislikeCounts = (
    commentVotes: Array<{ value: number; user_id?: string }>
  ) => {
    const likeCount = commentVotes.filter((vote) => vote.value === 1).length;
    const dislikeCount = commentVotes.filter(
      (vote) => vote.value === -1
    ).length;
    return { likeCount, dislikeCount };
  };

  const { likeCount: initialLikeCount, dislikeCount: initialDislikeCount } =
    comment.comment_votes
      ? getLikeDislikeCounts(comment.comment_votes)
      : { likeCount: 0, dislikeCount: 0 };

  const [localLikeCount, setLocalLikeCount] = useState(initialLikeCount);
  const [localDislikeCount, setLocalDislikeCount] =
    useState(initialDislikeCount);

  // Comment prop'u değiştiğinde local state'leri güncelle
  useEffect(() => {
    if (comment.comment_votes) {
      const { likeCount, dislikeCount } = getLikeDislikeCounts(
        comment.comment_votes
      );
      setLocalLikeCount(likeCount);
      setLocalDislikeCount(dislikeCount);
    } else {
      setLocalLikeCount(0);
      setLocalDislikeCount(0);
    }
    // user_vote da değişmiş olabilir
    setLocalVote(comment.user_vote || 0);
  }, [comment.comment_votes, comment.user_vote, comment.id]);

  const isOwnComment = comment.user_id === currentUserId;

  // Use local state, fallback to comment props
  const currentVote =
    localVote !== undefined ? localVote : comment.user_vote || 0;

  const handleEdit = async () => {
    if (!editText.trim()) return;

    try {
      const success = await onEdit(comment.id, editText.trim());
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Düzenleme hatası:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;

    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  const handleVote = async (value: number) => {
    // Temp ID'leri kontrol et - gerçek UUID değilse vote yapma
    if (comment.id.startsWith("temp-")) {
      console.log("Temp comment ID - vote geçici olarak devre dışı");
      return;
    }

    // Optimistic update - hemen UI'yi güncelle
    const currentVote =
      localVote !== undefined ? localVote : comment.user_vote || 0;

    // Eğer aynı butona tekrar basıldıysa (toggle) - vote'u kaldır
    if (currentVote === value) {
      setLocalVote(0);
      if (value === 1) {
        // Like vote kaldırılıyor
        setLocalLikeCount(Math.max(0, localLikeCount - 1));
      } else {
        // Dislike vote kaldırılıyor
        setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
      }
    } else {
      // Farklı butona basıldı - vote değiştir veya yeni vote
      const newVote = value;

      if (currentVote === 0) {
        // İlk defa oy veriliyor
        if (value === 1) {
          setLocalLikeCount(localLikeCount + 1);
        } else {
          setLocalDislikeCount(localDislikeCount + 1);
        }
      } else if (currentVote !== value) {
        // Vote değiştiriliyor (like'dan dislike'a veya tersine)
        if (currentVote === 1) {
          // Like'dan dislike'a geçiyor
          setLocalLikeCount(Math.max(0, localLikeCount - 1));
          setLocalDislikeCount(localDislikeCount + 1);
        } else {
          // Dislike'dan like'a geçiyor
          setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
          setLocalLikeCount(localLikeCount + 1);
        }
      }

      setLocalVote(newVote);
    }

    try {
      const success = await onVote(comment.id, value);
      if (!success) {
        // Başarısız olursa geri al
        setLocalVote(currentVote || 0);
        // Like/dislike sayılarını da geri al
        if (currentVote === 1) {
          setLocalLikeCount(Math.max(0, localLikeCount - 1));
        } else if (currentVote === -1) {
          setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
        }
      }
    } catch (error) {
      console.error("Oy verme hatası:", error);
      // Hata durumunda geri al
      setLocalVote(currentVote || 0);
      // Like/dislike sayılarını da geri al
      if (currentVote === 1) {
        setLocalLikeCount(Math.max(0, localLikeCount - 1));
      } else if (currentVote === -1) {
        setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
      }
    }
  };

  return (
    <div className="border-b border-amber-200 pb-6 last:border-b-0 mb-4 bg-gradient-to-br from-amber-50/20 to-yellow-50/20 p-4 rounded-lg shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-serif font-medium text-amber-900 flex items-center space-x-2">
          <span>👤</span>
          <span>{comment.users?.display_name || "Anonim"}</span>
        </h4>
        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full font-serif border border-amber-200">
          📅{" "}
          {new Date(comment.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-200 rounded-lg shadow-inner">
          <div className="relative">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-amber-900 placeholder-amber-600 font-serif text-sm leading-relaxed resize-none shadow-sm"
              rows={3}
              placeholder="Yorumunuzu düzenleyin..."
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px 16px",
                paddingRight: "40px",
              }}
            />
            <div className="absolute top-3 right-3 text-amber-500 opacity-60">
              ✒️
            </div>
          </div>
          <div className="flex space-x-3 justify-end">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-amber-600 text-amber-50 text-sm font-serif rounded-lg hover:bg-amber-700 transition-all duration-200 shadow-sm hover:shadow-md border border-amber-700 flex items-center space-x-2"
            >
              <span>💾</span>
              <span>Kaydet</span>
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(comment.text);
              }}
              className="px-4 py-2 bg-amber-100 text-amber-800 text-sm font-serif rounded-lg hover:bg-amber-200 transition-all duration-200 shadow-sm hover:shadow-md border border-amber-300 flex items-center space-x-2"
            >
              <span>❌</span>
              <span>İptal</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-amber-800 text-sm leading-relaxed mb-3 font-serif bg-amber-50/30 p-3 rounded-lg border-l-4 border-amber-300 shadow-sm">
            {comment.text}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Vote buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleVote(1)}
                disabled={comment.id.startsWith("temp-")}
                className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 font-serif flex items-center space-x-1 border ${
                  comment.id.startsWith("temp-")
                    ? "bg-amber-100 text-amber-400 cursor-not-allowed border-amber-200"
                    : currentVote === 1
                    ? "bg-amber-200 text-amber-900 border-amber-400 shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-900 border-amber-300 hover:shadow-sm"
                }`}
              >
                <span>👍</span>
                <span>{localLikeCount > 0 ? localLikeCount : 0}</span>
              </button>
              <button
                onClick={() => handleVote(-1)}
                disabled={comment.id.startsWith("temp-")}
                className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 font-serif flex items-center space-x-1 border ${
                  comment.id.startsWith("temp-")
                    ? "bg-amber-100 text-amber-400 cursor-not-allowed border-amber-200"
                    : currentVote === -1
                    ? "bg-red-200 text-red-900 border-red-400 shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-red-100 hover:text-red-900 border-amber-300 hover:shadow-sm"
                }`}
              >
                <span>👎</span>
                <span>{localDislikeCount > 0 ? localDislikeCount : 0}</span>
              </button>
            </div>

            {/* Edit/Delete buttons */}
            {isOwnComment && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-serif flex items-center space-x-1 transition-colors duration-200 hover:scale-105"
                >
                  <span>✏️</span>
                  <span>Düzenle</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-700 hover:text-red-900 font-serif flex items-center space-x-1 transition-colors duration-200 hover:scale-105"
                >
                  <span>🗑️</span>
                  <span>Sil</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
