"use client";

import { userService } from "@/lib/supabase/userService";
import { Comment, Pin } from "@/types";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

type TabType = "stats" | "pins" | "comments";

interface ProfileClientProps {
  user: User;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [stats, setStats] = useState<{
    totalPins: number;
    totalComments: number;
    totalLikes: number;
    totalDislikes: number;
  } | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // İstatistikleri yükle
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const { stats: userStats, error } = await userService.getUserStats(
        user.id
      );
      if (error) {
        setError(error);
      } else {
        setStats(
          userStats as {
            totalPins: number;
            totalComments: number;
            totalLikes: number;
            totalDislikes: number;
          } | null
        );
      }
      setLoading(false);
    };

    loadStats();
  }, [user.id]);

  // Tab değiştiğinde veri yükle
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    setError(null);

    if (tab === "pins" && pins.length === 0) {
      setLoading(true);
      const { pins: userPins, error } = await userService.getUserPins(user.id);
      if (error) {
        setError(error);
      } else {
        setPins(userPins || []);
      }
      setLoading(false);
    }

    if (tab === "comments" && comments.length === 0) {
      setLoading(true);
      const { comments: userComments, error } =
        await userService.getUserComments(user.id);
      if (error) {
        setError(error);
      } else {
        setComments(userComments || []);
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-amber-200/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 px-6 py-6 border-b border-amber-200/30">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-white">
                Profil
              </h1>
              <p className="text-amber-100 font-serif mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-amber-50/50 border-b border-amber-200/30">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "stats", label: "📊 İstatistikler" },
              { id: "pins", label: "📍 Pin'lerim" },
              { id: "comments", label: "💭 Yorumlarım" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-serif font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? "border-amber-600 text-amber-900 bg-amber-100/50"
                    : "border-transparent text-amber-700 hover:text-amber-900 hover:border-amber-300 hover:bg-amber-50/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50/70 border border-red-200 rounded-lg backdrop-blur-sm">
              <p className="text-sm text-red-700 font-serif flex items-center space-x-2">
                <span>❌</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
              <p className="text-amber-700 font-serif">Yükleniyor...</p>
            </div>
          )}

          {!loading && activeTab === "stats" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-200">
                      <span className="text-2xl">📍</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-serif font-medium text-amber-700">
                      Toplam Pin
                    </p>
                    <p className="text-3xl font-serif font-bold text-amber-900">
                      {stats.totalPins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-200">
                      <span className="text-2xl">💭</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-serif font-medium text-amber-700">
                      Toplam Yorum
                    </p>
                    <p className="text-3xl font-serif font-bold text-amber-900">
                      {stats.totalComments}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-amber-50 p-6 rounded-xl border border-green-200/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-200">
                      <span className="text-2xl">👍</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-serif font-medium text-green-700">
                      Toplam Like
                    </p>
                    <p className="text-3xl font-serif font-bold text-green-900">
                      {stats.totalLikes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-amber-50 p-6 rounded-xl border border-red-200/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-200">
                      <span className="text-2xl">👎</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-serif font-medium text-red-700">
                      Toplam Dislike
                    </p>
                    <p className="text-3xl font-serif font-bold text-red-900">
                      {stats.totalDislikes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === "pins" && (
            <div className="space-y-4">
              {pins.length === 0 ? (
                <div className="text-center py-12 bg-amber-50/50 rounded-xl border-2 border-dashed border-amber-200">
                  <span className="text-4xl mb-4 block">📍</span>
                  <p className="text-amber-700 font-serif text-lg mb-2">
                    Henüz pin oluşturmamışsınız.
                  </p>
                  <p className="text-amber-600 font-serif text-sm">
                    Haritaya tıklayarak ilk pin&apos;inizi oluşturun!
                  </p>
                </div>
              ) : (
                pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/30 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-serif font-semibold text-amber-900 text-lg flex items-center space-x-2">
                          <span>📍</span>
                          <span>{pin.name}</span>
                        </h3>
                        <p className="text-sm text-amber-600 font-serif mt-2 flex items-center space-x-2">
                          <span>📅</span>
                          <span>
                            {new Date(pin.created_at).toLocaleDateString(
                              "tr-TR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="bg-amber-100 rounded-full px-3 py-1 border border-amber-200">
                        <p className="text-sm text-amber-700 font-serif flex items-center space-x-1">
                          <span>💭</span>
                          <span>{pin.comments_count || 0} yorum</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === "comments" && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12 bg-amber-50/50 rounded-xl border-2 border-dashed border-amber-200">
                  <span className="text-4xl mb-4 block">💭</span>
                  <p className="text-amber-700 font-serif text-lg mb-2">
                    Henüz yorum yapmamışsınız.
                  </p>
                  <p className="text-amber-600 font-serif text-sm">
                    Pin&apos;lere tıklayarak düşüncelerinizi paylaşın!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/30 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-amber-900 font-serif leading-relaxed bg-white/50 p-4 rounded-lg border-l-4 border-amber-300 shadow-sm">
                          {comment.text}
                        </p>
                        <div className="mt-3 flex items-center space-x-4 text-sm text-amber-600 font-serif">
                          <span className="flex items-center space-x-1">
                            <span>📍</span>
                            <span>
                              {(
                                comment as Comment & {
                                  pins?: { name: string };
                                }
                              ).pins?.name || "Bilinmeyen Pin"}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>📅</span>
                            <span>
                              {new Date(comment.created_at).toLocaleDateString(
                                "tr-TR",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="bg-amber-100 rounded-full px-3 py-1 border border-amber-200 ml-4">
                        <p className="text-sm text-amber-700 font-serif flex items-center space-x-1">
                          <span>⭐</span>
                          <span>{comment.vote_count || 0} oy</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
