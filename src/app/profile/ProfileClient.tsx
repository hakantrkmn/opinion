"use client";

import { EditProfile } from "@/components/profile/EditProfile";
import { ProfileHero } from "@/components/profile/sections/ProfileHero";
import {
  ProfileCommentsList,
  ProfilePinsList,
} from "@/components/profile/sections/ProfileLists";
import { ProfileStatsGrid } from "@/components/profile/sections/ProfileStatsGrid";
import { ConnectionListDialog } from "@/components/profile/social/ConnectionListDialog";
import { UserSearchDialog } from "@/components/users/UserSearchDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useOwnProfileComments,
  useOwnProfilePins,
  useOwnProfileStats,
} from "@/hooks/queries/use-user-profile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { queryKeys } from "@/lib/api/query-keys";
import type { UserStats } from "@/types";
import { MessageCircle, Search, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PinIcon } from "@/components/icons/PinIcon";

type TabType = "stats" | "pins" | "comments";

interface ProfileClientProps {
  user: { id: string; email: string; name?: string; image?: string | null };
  userStats: UserStats;
}

export function ProfileClient({ user, userStats }: ProfileClientProps) {
  const { profile, updateProfile } = useUserProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pinsQuery = useOwnProfilePins(activeTab === "pins");
  const commentsQuery = useOwnProfileComments(activeTab === "comments");
  const statsQuery = useOwnProfileStats(user.id, { initialData: userStats });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.pins }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.comments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.me }),
      ]);
      router.refresh();
      toast.success("Profile refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSharePin = async (pinId: string, pinName: string) => {
    const shareUrl = `${window.location.origin}/pin/${pinId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Pin link copied", { description: pinName });
    } catch {
      toast.info("Share URL", { description: shareUrl });
    }
  };

  const handleProfileUpdate = (updates: {
    display_name?: string;
    avatar_url?: string | null;
  }) => {
    updateProfile({
      ...updates,
      avatar_url: updates.avatar_url || undefined,
    });
  };

  const error = pinsQuery.error?.message || commentsQuery.error?.message || statsQuery.error?.message;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6">
      <ProfileHero
        profile={profile}
        stats={statsQuery.data?.stats ?? userStats.stats}
        email={user.email}
        onEdit={() => setShowEditProfile(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onOpenFollowers={() => setShowFollowers(true)}
        onOpenFollowing={() => setShowFollowing(true)}
        primaryAction={
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setShowUserSearch(true)}
          >
            <Search className="h-4 w-4" />
            Find People
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive" className="mt-4 rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className="mt-6"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="stats" className="min-h-11 rounded-xl">
            <TrendingUp className="h-4 w-4" />
            <span>Stats</span>
          </TabsTrigger>
          <TabsTrigger value="pins" className="min-h-11 rounded-xl">
            <PinIcon className="h-4 w-4" />
            <span>Pins</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="min-h-11 rounded-xl">
            <MessageCircle className="h-4 w-4" />
            <span>Comments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <ProfileStatsGrid stats={statsQuery.data?.stats ?? userStats.stats} />
        </TabsContent>

        <TabsContent value="pins" className="mt-4">
          <ProfilePinsList
            pins={pinsQuery.data || []}
            onShare={(pin) => handleSharePin(pin.id, pin.name)}
          />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <ProfileCommentsList comments={commentsQuery.data || []} />
        </TabsContent>
      </Tabs>

      <EditProfile
        user={user}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onProfileUpdate={handleProfileUpdate}
      />

      <ConnectionListDialog
        userId={user.id}
        open={showFollowers}
        onOpenChange={setShowFollowers}
        type="followers"
      />
      <ConnectionListDialog
        userId={user.id}
        open={showFollowing}
        onOpenChange={setShowFollowing}
        type="following"
      />
      <UserSearchDialog open={showUserSearch} onOpenChange={setShowUserSearch} />
    </div>
  );
}
