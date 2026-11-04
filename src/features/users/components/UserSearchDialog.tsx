"use client";

import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { useUserSearch } from "@/features/users/hooks/use-user-social";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AlertCircle, RotateCcw, Search, UserRoundSearch, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ListMessage, UserListSkeleton, UserRow } from "@/features/users/components/UserRow";

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchDialog({ open, onOpenChange }: UserSearchDialogProps) {
  const t = useTranslations("users.search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const search = useUserSearch(debouncedQuery);
  const users = search.items;
  const trimmed = query.trim();
  const settling = debouncedQuery.trim() !== trimmed;

  // Start fresh next time the dialog opens.
  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent
        desktopClassName="sm:max-w-md sm:top-[12dvh] sm:translate-y-0"
        mobileClassName="max-h-[85dvh] overflow-hidden"
      >
        <ResponsiveDialogPanel title={t("title")} description={t("description")}>
          <div className="flex flex-col gap-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <form
              role="search"
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                (document.activeElement as HTMLElement | null)?.blur();
              }}
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                name="user-search"
                aria-label={t("inputLabel")}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("placeholder")}
                className="h-11 rounded-xl pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clear")}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <X aria-hidden className="size-4" />
                </button>
              ) : null}
            </form>

            <div className="-mx-3 max-h-[min(55dvh,26rem)] min-h-48 overflow-y-auto overscroll-contain sm:-mx-4">
              {trimmed.length < 2 ? (
                <ListMessage
                  icon={<UserRoundSearch aria-hidden />}
                  title={t("promptTitle")}
                  description={t("promptDescription")}
                />
              ) : search.isLoading || (settling && users.length === 0) ? (
                <UserListSkeleton rows={3} />
              ) : search.error && users.length === 0 ? (
                <ListMessage
                  tone="error"
                  icon={<AlertCircle aria-hidden />}
                  title={t("errorTitle")}
                  description={search.error.message}
                  action={
                    <Button variant="outline" className="h-10 rounded-xl" onClick={() => void search.refetch()}>
                      <RotateCcw aria-hidden />
                      {t("tryAgain")}
                    </Button>
                  }
                />
              ) : users.length === 0 ? (
                <ListMessage
                  icon={<UserRoundSearch aria-hidden />}
                  title={t("emptyTitle")}
                  description={t("emptyDescription", { query: trimmed })}
                />
              ) : (
                <div className="px-3 sm:px-4">
                  <p className="sr-only" aria-live="polite">
                    {t("results", { count: users.length })}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {users.map((user) => (
                      <UserRow
                        key={user.id}
                        id={user.id}
                        name={user.display_name || t("unnamed")}
                        avatarUrl={user.avatar_url}
                        onNavigate={() => handleOpenChange(false)}
                      />
                    ))}
                  </ul>
                  <LoadMore {...search} className="mt-1" />
                </div>
              )}
            </div>
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
