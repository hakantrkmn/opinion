"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { BlockedUsersDialog } from "@/features/moderation/components/BlockedUsersDialog";
import { AvatarUploader } from "@/features/profile/components/sections/AvatarUploader";
import { DisplayNameEditor } from "@/features/profile/components/sections/DisplayNameEditor";
import { ProfileHero } from "@/features/profile/components/sections/ProfileHero";
import { ProfileTabs } from "@/features/profile/components/sections/ProfileTabs";
import {
  EmptyState,
  ProfileCommentsList,
  ProfilePinsList,
} from "@/features/profile/components/sections/ProfileLists";
import { AccountSettingsDialog } from "@/features/profile/components/settings/AccountSettingsDialog";
import { EmailVerificationBanner } from "@/features/profile/components/settings/EmailVerificationBanner";
import { ConnectionListDialog } from "@/features/profile/components/social/ConnectionListDialog";
import { UserSearchDialog } from "@/features/users/components/UserSearchDialog";
import { pinShareUrl } from "@/features/pins/lib/links";
import { Button } from "@/components/ui/button";
import {
  useOwnProfile,
  useOwnProfileComments,
  useOwnProfilePins,
} from "@/features/profile/hooks/use-user-profile";
import type { PinSummary } from "@/types/api";
import type { OwnProfileResponse } from "@/types/userTypes";
import { Map as MapIcon, MessageCircle, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Dialog = "settings" | "followers" | "following" | "search" | "blocked" | null;

export function ProfileClient({ initial }: { initial: OwnProfileResponse }) {
  const t = useTranslations("profile.own");
  const tHero = useTranslations("profile.hero");
  const [dialog, setDialog] = useState<Dialog>(null);
  const openChange = (which: Exclude<Dialog, null>) => (open: boolean) =>
    setDialog(open ? which : null);

  // Seeded with the server-rendered profile; refetched when stale.
  const meQuery = useOwnProfile(true, initial);
  const profile = meQuery.data?.profile ?? initial.profile;
  const stats = meQuery.data?.stats ?? initial.stats;
  const name = profile.display_name || tHero("unnamed");

  const [tab, setTab] = useState<"pins" | "comments">("pins");
  const pinsQuery = useOwnProfilePins(tab === "pins");
  const commentsQuery = useOwnProfileComments(tab === "comments");

  const handleSharePin = async (pin: PinSummary) => {
    const shareUrl = pinShareUrl(pin);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("linkCopied"), { id: "copy-pin-link", description: pin.name });
    } catch {
      toast.info(t("copyThisLink"), { id: "copy-pin-link", description: shareUrl });
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
      <ProfileHero
        profile={profile}
        stats={stats}
        subtitle={profile.email}
        avatarSlot={<AvatarUploader src={profile.avatar_url} name={name} />}
        nameSlot={<DisplayNameEditor name={name} />}
        onOpenFollowers={() => setDialog("followers")}
        onOpenFollowing={() => setDialog("following")}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-xl sm:flex-none"
              onClick={() => setDialog("search")}
            >
              <Search aria-hidden />
              {t("findPeople")}
            </Button>
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-xl sm:flex-none"
              onClick={() => setDialog("settings")}
            >
              <Settings aria-hidden />
              {t("settings")}
            </Button>
          </>
        }
      />

      {!profile.email_verified ? (
        <EmailVerificationBanner onVerify={() => setDialog("settings")} />
      ) : null}

      <ProfileTabs
        value={tab}
        onValueChange={setTab}
        pinsCount={stats?.total_pins}
        commentsCount={stats?.total_comments}
        pins={
          <ProfilePinsList
            pins={pinsQuery.items}
            state={pinsQuery}
            onShare={handleSharePin}
            empty={
              <EmptyState
                icon={<PinIcon className="size-5" />}
                title={t("noPinsTitle")}
                description={t("noPinsDescription")}
                action={
                  <Button asChild className="h-10 rounded-xl">
                    <Link href="/">
                      <PinIcon className="size-4" />
                      {t("dropFirstPin")}
                    </Link>
                  </Button>
                }
              />
            }
          />
        }
        comments={
          <ProfileCommentsList
            comments={commentsQuery.items}
            state={commentsQuery}
            empty={
              <EmptyState
                icon={<MessageCircle aria-hidden className="size-5" />}
                title={t("noCommentsTitle")}
                description={t("noCommentsDescription")}
                action={
                  <Button asChild variant="outline" className="h-10 rounded-xl">
                    <Link href="/">
                      <MapIcon aria-hidden />
                      {t("exploreMap")}
                    </Link>
                  </Button>
                }
              />
            }
          />
        }
      />

      <AccountSettingsDialog
        profile={profile}
        open={dialog === "settings"}
        onOpenChange={openChange("settings")}
        onOpenBlocked={() => setDialog("blocked")}
      />
      <ConnectionListDialog
        userId={profile.id}
        userName={name}
        open={dialog === "followers"}
        onOpenChange={openChange("followers")}
        type="followers"
      />
      <ConnectionListDialog
        userId={profile.id}
        userName={name}
        open={dialog === "following"}
        onOpenChange={openChange("following")}
        type="following"
      />
      <UserSearchDialog open={dialog === "search"} onOpenChange={openChange("search")} />
      {/* Opened from Settings; closing it goes back there. */}
      <BlockedUsersDialog
        open={dialog === "blocked"}
        onOpenChange={(open) => setDialog(open ? "blocked" : "settings")}
      />
    </div>
  );
}
