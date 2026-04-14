"use client";

import { ProfileHero } from "@/components/profile/sections/ProfileHero";
import {
  ProfileCommentsList,
  ProfilePinsList,
} from "@/components/profile/sections/ProfileLists";
import { ProfileStatsGrid } from "@/components/profile/sections/ProfileStatsGrid";
import { ConnectionListDialog } from "@/components/profile/social/ConnectionListDialog";
import { FollowButton } from "@/components/profile/social/FollowButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePublicUserComments,
  usePublicUserPins,
  usePublicUserProfile,
  usePublicUserStats,
} from "@/hooks/queries/use-user-profile";
import { MessageCircle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { PinIcon } from "@/components/icons/PinIcon";

type TabType = "stats" | "pins" | "comments";

export function PublicProfileClient({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const profileQuery = usePublicUserProfile(userId);
  const statsQuery = usePublicUserStats(userId);
  const pinsQuery = usePublicUserPins(userId, activeTab === "pins");
  const commentsQuery = usePublicUserComments(userId, activeTab === "comments");

  const error =
    profileQuery.error?.message ||
    statsQuery.error?.message ||
    pinsQuery.error?.message ||
    commentsQuery.error?.message;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6">
      <ProfileHero
        profile={profileQuery.data || null}
        stats={statsQuery.data?.stats}
        primaryAction={<FollowButton userId={userId} />}
        onOpenFollowers={() => setShowFollowers(true)}
        onOpenFollowing={() => setShowFollowing(true)}
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
          <ProfileStatsGrid stats={statsQuery.data?.stats} />
        </TabsContent>
        <TabsContent value="pins" className="mt-4">
          <ProfilePinsList pins={pinsQuery.data || []} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <ProfileCommentsList comments={commentsQuery.data || []} />
        </TabsContent>
      </Tabs>

      <ConnectionListDialog
        userId={userId}
        open={showFollowers}
        onOpenChange={setShowFollowers}
        type="followers"
      />
      <ConnectionListDialog
        userId={userId}
        open={showFollowing}
        onOpenChange={setShowFollowing}
        type="following"
      />
    </div>
  );
}
