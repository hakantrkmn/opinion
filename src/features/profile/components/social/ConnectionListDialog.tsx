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
  const followersQuery = useFollowers(userId, open && type === "followers");
  const followingQuery = useFollowing(userId, open && type === "following");
  const query = type === "followers" ? followersQuery : followingQuery;
  const items = query.items;
  const who = userName || "This person";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[85dvh] overflow-hidden"
        desktopClassName="sm:max-w-md"
      >
        <ResponsiveDialogPanel
          title={type === "followers" ? "Followers" : "Following"}
          description={
            type === "followers" ? `People following ${who}.` : `People ${who} follows.`
          }
        >
          <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
            {query.isLoading ? (
              <UserListSkeleton />
            ) : query.error && items.length === 0 ? (
              <ListMessage
                tone="error"
                icon={<AlertCircle aria-hidden />}
                title="Couldn't load this list"
                description={query.error.message}
                action={
                  <Button variant="outline" className="h-10 rounded-xl" onClick={() => void query.refetch()}>
                    <RotateCcw aria-hidden />
                    Try again
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <ListMessage
                icon={<Users aria-hidden />}
                title={type === "followers" ? "No followers yet" : "Not following anyone yet"}
                description={
                  type === "followers"
                    ? "When people follow this profile, they'll show up here."
                    : "Followed people's pins show up in the Following view on the map."
                }
              />
            ) : (
              <>
                <ul className="flex flex-col gap-0.5">
                  {items.map((connection) => (
                    <UserRow
                      key={connection.id}
                      id={connection.id}
                      name={connection.display_name || "Unnamed user"}
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
