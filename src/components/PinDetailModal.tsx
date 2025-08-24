"use client";

import type { Comment } from "@/types";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import CommentItem from "./CommentItem";

interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  comments: Comment[];
  onAddComment: (text: string) => Promise<boolean>;
  onEditComment: (commentId: string, newText: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  onVoteComment: (commentId: string, value: number) => Promise<boolean>;
  currentUserId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function PinDetailModal({
  isOpen,
  onClose,
  pinName,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onVoteComment,
  currentUserId,
  loading = false,
  onRefresh,
}: PinDetailModalProps) {
  const [newComment, setNewComment] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh hatası:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment(""); // Input'u hemen temizle

    try {
      const success = await onAddComment(commentText);
      if (success) {
        // Başarılı ekleme sonrası input'a focus geri ver
        setTimeout(() => {
          const input = document.querySelector(
            'input[placeholder="Düşüncelerinizi paylaşın..."]'
          ) as HTMLInputElement;
          if (input) input.focus();
        }, 100);
      } else {
        // Başarısız olursa input'u geri getir
        setNewComment(commentText);
      }
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      // Hata durumunda input'u geri getir
      setNewComment(commentText);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-5  flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-200/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden font-serif">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-b border-amber-200/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📜</span>
              <div>
                <h2 className="text-2xl font-bold text-amber-900 leading-tight">
                  {pinName}
                </h2>
                <p className="text-amber-700 text-sm mt-1">
                  {comments.length} düşünce
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 bg-amber-200/70 hover:bg-amber-300/70 text-amber-900 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  title="Yorumları yenile"
                >
                  <RefreshCcw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-amber-200/70 hover:bg-amber-300/70 text-amber-900 rounded-lg transition-all duration-200 hover:scale-105"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="p-6 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-amber-100">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-amber-700">Düşünceler yükleniyor...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-amber-700 py-8 bg-amber-50/50 rounded-lg border border-amber-200/30">
              <span className="text-4xl mb-4 block">📜</span>
              <p className="font-medium">Henüz düşünce yok.</p>
              <p className="text-sm mt-1">İlk düşünceyi siz paylaşın!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  onVote={onVoteComment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Comment */}
        <div className="p-6 border-t border-amber-200/50 bg-amber-50/30">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Düşüncelerinizi paylaşın..."
                className="w-full px-4 py-3 pr-12 border border-amber-200 rounded-lg bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-amber-100/50 text-amber-900 placeholder-amber-600 transition-all duration-200 font-serif"
                disabled={false}
              />
              <div className="absolute right-3 top-3 text-amber-500 opacity-60">
                💭
              </div>
            </div>
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg hover:from-amber-700 hover:to-yellow-700 transition-all duration-200 disabled:from-amber-400 disabled:to-yellow-400 disabled:cursor-not-allowed transform hover:scale-105 font-medium font-serif flex items-center space-x-2"
            >
              <span>📤</span>
              <span>Paylaş</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
