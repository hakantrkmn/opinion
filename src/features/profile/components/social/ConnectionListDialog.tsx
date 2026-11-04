"use client";

import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { ListMessage, UserListSkeleton, UserRow } from "@/features/users/components/UserRow";
import { useFollowers, useFollowing } from "@/features/users/hooks/use-user-social";
import { AlertCircle, RotateCcw, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConnectionListDialogProps {
  userId: string;
  /** Display name of the profile owner, for the description. */
  userName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "followers" | "following";
}

export function ConnectionListDialog({
  userId,
  userName,
  open,
  onOpenChange,
  type,
}: ConnectionListDialogProps) {
  const t = useTranslations("profile.connections");
  const followersQuery = useFollowers(userId, open && type === "followers");
  const followingQuery = useFollowing(userId, open && type === "following");
  const query = type === "followers" ? followersQuery : followingQuery;
  const items = query.items;
  const who = userName || t("thisPerson");

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[85dvh] overflow-hidden"
        desktopClassName="sm:max-w-md"
      >
        <ResponsiveDialogPanel
          title={type === "followers" ? t("followers") : t("following")}
          description={
            type === "followers"
              ? t("followersDescription", { name: who })
              : t("followingDescription", { name: who })
          }
        >
          <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
            {query.isLoading ? (
              <UserListSkeleton />
            ) : query.error && items.length === 0 ? (
              <ListMessage
                tone="error"
                icon={<AlertCircle aria-hidden />}
                title={t("loadError")}
                description={query.error.message}
                action={
                  <Button variant="outline" className="h-10 rounded-xl" onClick={() => void query.refetch()}>
                    <RotateCcw aria-hidden />
                    {t("tryAgain")}
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <ListMessage
                icon={<Users aria-hidden />}
                title={type === "followers" ? t("noFollowersTitle") : t("noFollowingTitle")}
                description={
                  type === "followers"
                    ? t("noFollowersDescription")
                    : t("noFollowingDescription")
                }
              />
            ) : (
              <>
                <ul className="flex flex-col gap-0.5">
                  {items.map((connection) => (
                    <UserRow
                      key={connection.id}
                      id={connection.id}
                      name={connection.display_name || t("unnamed")}
                      avatarUrl={connection.avatar_url}
                      onNavigate={() => onOpenChange(false)}
                    />
                  ))}
                </ul>
                <LoadMore {...query} className="mt-1" />
              </>
            )}
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
