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
  const [stats, setStats] = useState<any>(null);
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
        setStats(userStats);
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
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
          <p className="text-sm text-gray-600 mt-1">{user.email}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "stats", label: "İstatistikler" },
              { id: "pins", label: "Pin'lerim" },
              { id: "comments", label: "Yorumlarım" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && activeTab === "stats" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Toplam Pin
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.totalPins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Toplam Yorum
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.totalComments}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Toplam Oy
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.totalVotes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === "pins" && (
            <div className="space-y-4">
              {pins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz pin oluşturmamışsınız.
                </p>
              ) : (
                pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-medium text-gray-900">{pin.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(pin.created_at).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {pin.comments_count || 0} yorum
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === "comments" && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz yorum yapmamışsınız.
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <p className="text-gray-900">{comment.text}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {comment.pins?.name} •{" "}
                      {new Date(comment.created_at).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {comment.vote_count || 0} oy
                    </p>
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
