"use client";

import { EditProfile } from "@/components/profile/EditProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserPins, useUserComments } from "@/hooks/queries/use-profile";
import type { Comment, Pin, UserStats } from "@/types";
import {
  Calendar,
  ChevronRight,
  Edit3,
  MapPin,
  MessageCircle,
  Share2,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type TabType = "stats" | "pins" | "comments";

interface ProfileClientProps {
  user: { id: string; email: string; name?: string; image?: string | null };
  userStats: UserStats;
}

export function ProfileClient({ user, userStats }: ProfileClientProps) {
  const { profile, updateProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: pins = [], isLoading: pinsLoading, error: pinsError } = useUserPins(activeTab === "pins");
  const { data: comments = [], isLoading: commentsLoading, error: commentsError } = useUserComments(activeTab === "comments");

  const loading = pinsLoading || commentsLoading;
  const error = pinsError?.message || commentsError?.message || null;

  const handleProfileUpdate = (updates: {
    display_name?: string;
    avatar_url?: string | null;
  }) => {
    const normalizedUpdates = {
      ...updates,
      avatar_url: updates.avatar_url || undefined,
    };
    updateProfile(normalizedUpdates);
  };

  const handlePinShare = async (pin: Pin) => {
    if (!pin.location?.coordinates) return;
    const [lng, lat] = pin.location.coordinates;
    const currentUrl = window.location.origin;
    const shareUrl = `${currentUrl}/?lat=${lat.toFixed(6)}&long=${lng.toFixed(6)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Pin link copied!", {
        description: `Share "${pin.name}" with others`,
        duration: 3000,
      });
    } catch {
      toast.info("Share URL", { description: shareUrl, duration: 5000 });
    }
  };

  const stats = userStats.stats;
  const totalPins = stats?.totalPins || 0;
  const totalComments = stats?.totalComments || 0;
  const totalLikes = stats?.totalLikes || 0;
  const totalDislikes = stats?.totalDislikes || 0;
  const totalVotesGiven = stats?.totalVotesGiven || 0;
  const netScore = totalLikes - totalDislikes;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Profile Hero */}
      <div className="relative mb-8">
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/8 via-blue-500/5 to-transparent" />

        <div className="relative px-6 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 opacity-20 blur-sm group-hover:opacity-30 transition-opacity" />
              <Avatar
                src={profile?.avatar_url}
                alt={profile?.display_name || user.email || "User"}
                size="xl"
                fallbackText={profile?.display_name || user.email}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {profile?.display_name || "Anonymous User"}
              </h1>
              <p className="text-sm text-muted-foreground/70 mt-0.5 truncate">
                {user.email}
              </p>

              {/* Quick stats row */}
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-semibold text-foreground">{totalPins}</span>
                  <span className="text-muted-foreground/60 text-xs">pins</span>
                </div>
                <div className="w-px h-3.5 bg-border/60" />
                <div className="flex items-center gap-1.5 text-sm">
                  <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-semibold text-foreground">{totalComments}</span>
                  <span className="text-muted-foreground/60 text-xs">comments</span>
                </div>
                <div className="w-px h-3.5 bg-border/60" />
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className={`h-3.5 w-3.5 ${netScore >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span className="font-semibold text-foreground">{netScore >= 0 ? '+' : ''}{netScore}</span>
                  <span className="text-muted-foreground/60 text-xs">score</span>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setShowEditProfile(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl border border-border/50 bg-background/80 hover:bg-muted/60 text-foreground transition-all cursor-pointer hover:border-border"
              >
                <Edit3 className="h-3 w-3" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
      >
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-muted/40 p-1">
          <TabsTrigger
            value="stats"
            className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Statistics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger
            value="pins"
            className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">My Pins</span>
            <span className="sm:hidden">Pins</span>
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">My Comments</span>
            <span className="sm:hidden">Comments</span>
          </TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mt-4 rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-border/40 bg-muted/20">
                <div className="h-3 w-12 bg-muted animate-pulse rounded-md mb-3" />
                <div className="h-7 w-16 bg-muted animate-pulse rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          {!loading && stats && (
            <div className="space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Pins Created"
                  value={totalPins}
                  icon={<MapPin className="h-4 w-4" />}
                  color="indigo"
                />
                <StatCard
                  label="Comments"
                  value={totalComments}
                  icon={<MessageCircle className="h-4 w-4" />}
                  color="blue"
                />
                <StatCard
                  label="Likes Received"
                  value={totalLikes}
                  icon={<ThumbsUp className="h-4 w-4" />}
                  color="emerald"
                />
                <StatCard
                  label="Dislikes Received"
                  value={totalDislikes}
                  icon={<ThumbsDown className="h-4 w-4" />}
                  color="red"
                />
                <StatCard
                  label="Votes Given"
                  value={totalVotesGiven}
                  icon={<Vote className="h-4 w-4" />}
                  color="amber"
                />
                {stats.lastActivityAt && (
                  <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-border/60 transition-colors">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Last Active</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(stats.lastActivityAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Pins Tab */}
        <TabsContent value="pins" className="mt-6">
          {!loading && (
            <div className="space-y-2">
              {pins.length === 0 ? (
                <EmptyState
                  icon={<MapPin className="h-8 w-8" />}
                  title="No pins yet"
                  description="Long-press on the map to create your first pin"
                />
              ) : (
                pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-card hover:border-border/60 hover:shadow-sm transition-all"
                  >
                    {/* Pin icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 flex items-center justify-center">
                      <MapPin className="h-4.5 w-4.5 text-indigo-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {pin.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                          <MessageCircle className="h-2.5 w-2.5" />
                          {pin.comments_count || 0}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          {new Date(pin.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handlePinShare(pin)}
                      className="flex-shrink-0 p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                      title="Share pin"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-6">
          {!loading && (
            <div className="space-y-2">
              {comments.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle className="h-8 w-8" />}
                  title="No comments yet"
                  description="Tap on pins to share your thoughts"
                />
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="group p-3.5 rounded-2xl border border-border/40 bg-card hover:border-border/60 hover:shadow-sm transition-all"
                  >
                    {/* Comment text */}
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {comment.text}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[120px]">
                            {(comment as Comment & { pins?: { name: string } }).pins?.name || "Unknown"}
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          {new Date(comment.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {/* Vote count */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        (comment.vote_count || 0) > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : (comment.vote_count || 0) < 0
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <ThumbsUp className="h-2.5 w-2.5" />
                        {comment.vote_count || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <EditProfile
        user={user}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "indigo" | "blue" | "emerald" | "red" | "amber";
}) {
  const colorMap = {
    indigo: "text-indigo-500 bg-indigo-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    red: "text-red-500 bg-red-500/10",
    amber: "text-amber-500 bg-amber-500/10",
  };
  const [textColor, bgColor] = colorMap[color].split(" ");

  return (
    <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-border/60 transition-colors">
      <div className="flex items-center gap-1.5 mb-2">
        <div className={textColor}>{icon}</div>
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/8 to-blue-500/8 flex items-center justify-center mb-4 text-muted-foreground/30">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground/60 max-w-[200px]">{description}</p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
      >
        Go to Map
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
