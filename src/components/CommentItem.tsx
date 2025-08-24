"use client";

import type { Comment } from "@/types";
import { useState } from "react";

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
  const [localCount, setLocalCount] = useState(comment.vote_count || 0);

  const isOwnComment = comment.user_id === currentUserId;

  // Use local state, fallback to comment props
  const currentVote =
    localVote !== undefined ? localVote : comment.user_vote || 0;
  const currentCount =
    localCount !== undefined ? localCount : comment.vote_count || 0;

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
    const currentCount =
      localCount !== undefined ? localCount : comment.vote_count || 0;

    // Eğer aynı butona tekrar basıldıysa (toggle)
    if (currentVote === value) {
      // Vote'u kaldır
      setLocalVote(0);
      setLocalCount(currentCount - 1);
    } else {
      // Yeni vote veya vote değiştir
      const countChange = currentVote === 0 ? 1 : 2; // 0->1: +1, 1->-1: +2, -1->1: +2
      setLocalVote(value);
      setLocalCount(currentCount + countChange);
    }

    try {
      const success = await onVote(comment.id, value);
      if (!success) {
        // Başarısız olursa geri al
        setLocalVote(currentVote || 0);
        setLocalCount(currentCount || 0);
      }
    } catch (error) {
      console.error("Oy verme hatası:", error);
      // Hata durumunda geri al
      setLocalVote(currentVote || 0);
      setLocalCount(currentCount || 0);
    }
  };

  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-800">
          {comment.users?.display_name || "Anonim"}
        </h4>
        <span className="text-xs text-gray-500">
          {new Date(comment.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Kaydet
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(comment.text);
              }}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            {comment.text}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Vote buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleVote(1)}
                disabled={comment.id.startsWith("temp-")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  comment.id.startsWith("temp-")
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : currentVote === 1
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200"
                }`}
              >
                Beğen {currentCount > 0 ? `(${currentCount})` : ""}
              </button>
              <button
                onClick={() => handleVote(-1)}
                disabled={comment.id.startsWith("temp-")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  comment.id.startsWith("temp-")
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : currentVote === -1
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-200"
                }`}
              >
                Beğenme
              </button>
            </div>

            {/* Edit/Delete buttons */}
            {isOwnComment && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Düzenle
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Sil
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
