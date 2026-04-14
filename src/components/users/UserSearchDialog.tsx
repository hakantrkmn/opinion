"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { useUserSearch } from "@/hooks/queries/use-user-social";
import { Loader2, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchDialog({
  open,
  onOpenChange,
}: UserSearchDialogProps) {
  const [query, setQuery] = useState("");
  const search = useUserSearch(query, 10, 0);
  const users = search.data?.users ?? [];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="max-w-xl">
        <ResponsiveDialogPanel
          title="Find People"
          description="Search by display name and open a profile."
        >
          <div className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="user-search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users…"
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="max-h-[55dvh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
                  Enter at least two characters.
                </div>
              ) : search.isLoading ? (
                <div className="flex min-h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
                  No users found.
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/u/${user.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3 transition-colors hover:bg-muted/40"
                      onClick={() => onOpenChange(false)}
                    >
                      <Avatar
                        src={user.avatar_url}
                        alt={user.display_name || "User"}
                        size="md"
                        fallbackText={user.display_name || "User"}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user.display_name || "Anonymous User"}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3 w-3" />
                          Open profile
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="h-11 w-full rounded-xl sm:hidden"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
