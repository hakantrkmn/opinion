"use client";

import { EditProfile } from "@/components/profile/EditProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { userService } from "@/lib/supabase/userService";
import type { Comment, Pin, UserStats } from "@/types";
import type { User } from "@supabase/supabase-js";
import {
  Calendar,
  Edit3,
  Loader2,
  MapPin,
  MessageCircle,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TabType = "stats" | "pins" | "comments";

interface ProfileClientProps {
  user: User;
  userStats: UserStats;
}

export function ProfileClient({ user, userStats }: ProfileClientProps) {
  const { profile, updateProfile, getProfileFromDB } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [pins, setPins] = useState<Pin[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Load data when tab changes
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

  // Handle profile updates
  const handleProfileUpdate = (updates: {
    display_name?: string;
    avatar_url?: string | null;
  }) => {
    // Convert null to undefined to match UserProfile interface
    const normalizedUpdates = {
      ...updates,
      avatar_url: updates.avatar_url || undefined,
    };
    updateProfile(normalizedUpdates);
  };

  // Handle pin sharing
  const handlePinShare = async (pin: Pin) => {
    if (!pin.location?.coordinates) return;

    // Extract coordinates from PostGIS POINT format
    const [lng, lat] = pin.location.coordinates;
    const currentUrl = window.location.origin;
    const shareUrl = `${currentUrl}/?lat=${lat.toFixed(6)}&long=${lng.toFixed(
      6
    )}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Pin link copied to clipboard!", {
        description: `Share "${pin.name}" with others`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show the URL in a toast for manual copying
      toast.info("Share URL", {
        description: shareUrl,
        duration: 5000,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-muted/50">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            {/* Avatar */}
            <Avatar
              src={profile?.avatar_url}
              alt={profile?.display_name || user.email || "User"}
              size="xl"
              fallbackText={profile?.display_name || user.email}
            />

            {/* Profile Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">
                    {profile?.display_name || "Anonymous User"}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base break-all">
                    {user.email}
                  </CardDescription>
                </div>

                {/* Edit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditProfile(true)}
                  className="flex items-center gap-2 self-center sm:self-start"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => handleTabChange(value as TabType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="stats"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Statistics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger
                value="pins"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">My Pins</span>
                <span className="sm:hidden">Pins</span>
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">My Comments</span>
                <span className="sm:hidden">Comments</span>
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex flex-col justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            )}

            <TabsContent value="stats" className="mt-6">
              {!loading && userStats.stats && (
                <div className="space-y-6">
                  {/* Statistics Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Pins */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Total Pins
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {userStats.stats?.totalPins || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Total Comments */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Comments
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {userStats.stats?.totalComments || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Total Likes */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ThumbsUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Likes Received
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {userStats.stats?.totalLikes || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Total Dislikes */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ThumbsDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Dislikes Received
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {userStats.stats?.totalDislikes || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Votes Given */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg
                              className="h-6 w-6 text-purple-600 dark:text-purple-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Votes Given
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {userStats.stats?.totalVotesGiven || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Last Activity */}
                    {userStats.stats?.lastActivityAt && (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Last Activity
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {new Date(
                                  userStats.stats?.lastActivityAt
                                ).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pins" className="mt-4 sm:mt-6">
              {!loading && (
                <div className="space-y-4">
                  {pins.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 sm:p-12 text-center">
                        <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle className="text-base sm:text-lg mb-2">
                          No pins yet
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Click on the map to create your first pin and share
                          your opinion!
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ) : (
                    pins.map((pin) => (
                      <Card key={pin.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                <span className="truncate">{pin.name}</span>
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {new Date(pin.created_at).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0"
                              >
                                <MessageCircle className="h-3 w-3" />
                                {pin.comments_count || 0}
                                <span className="hidden sm:inline">
                                  comments
                                </span>
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePinShare(pin)}
                                title="Share this pin"
                                className="flex items-center gap-1 h-8 px-2 sm:px-3"
                              >
                                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline text-xs">
                                  Share
                                </span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-4 sm:mt-6">
              {!loading && (
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 sm:p-12 text-center">
                        <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle className="text-base sm:text-lg mb-2">
                          No comments yet
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Click on pins to share your thoughts and opinions!
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col gap-3">
                            <div className="flex-1">
                              <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3">
                                {comment.text}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {(
                                      comment as Comment & {
                                        pins?: { name: string };
                                      }
                                    ).pins?.name || "Unknown Pin"}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {new Date(
                                      comment.created_at
                                    ).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 text-xs"
                              >
                                <ThumbsUp className="h-3 w-3" />
                                {comment.vote_count || 0}
                                <span className="hidden sm:inline">votes</span>
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
