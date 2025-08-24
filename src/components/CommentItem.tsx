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
  const [submitting, setSubmitting] = useState(false);

  const isOwnComment = comment.user_id === currentUserId;

  const handleEdit = async () => {
    if (!editText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const success = await onEdit(comment.id, editText.trim());
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Düzenleme hatası:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;

    setSubmitting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Silme hatası:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (value: number) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await onVote(comment.id, value);
    } catch (error) {
      console.error("Oy verme hatası:", error);
    } finally {
      setSubmitting(false);
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
            disabled={submitting}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              disabled={submitting}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(comment.text);
              }}
              disabled={submitting}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-400"
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
                disabled={submitting}
                className={`p-1 rounded transition-colors ${
                  comment.user_vote === 1
                    ? "text-green-600 bg-green-100"
                    : "text-gray-500 hover:text-green-600"
                }`}
              >
                👍{" "}
                {comment.vote_count && comment.vote_count > 0
                  ? comment.vote_count
                  : ""}
              </button>
              <button
                onClick={() => handleVote(-1)}
                disabled={submitting}
                className={`p-1 rounded transition-colors ${
                  comment.user_vote === -1
                    ? "text-red-600 bg-red-100"
                    : "text-gray-500 hover:text-red-600"
                }`}
              >
                👎
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
