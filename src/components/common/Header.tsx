"use client";

import { Avatar } from "@/components/ui/Avatar";
import { UserSearchDialog } from "@/features/users/components/UserSearchDialog";
import { useSession } from "@/features/auth/hooks/useSession";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { Coffee, Loader2, LogOut, Search, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SUPPORT_URL } from "./support";
import { UserMenu } from "./UserMenu";

/** 36px on mouse, 44px on touch. */
const iconButton =
  "flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96] pointer-coarse:size-11 [&_svg]:size-4";

const textButton =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5";

export default function Header() {
  const { user, isLoading, signOut, isSigningOut } = useSession();
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const [showUserSearch, setShowUserSearch] = useState(false);

  const name = profile?.display_name || user?.name || user?.email || "You";
  // `role` is an additional field on the better-auth user.
  const isAdmin = (user as { role?: string | null } | null)?.role === "admin";

  return (
    <>
      <header className="sticky top-0 z-(--z-header) border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div
          className="mx-auto flex max-w-7xl items-center justify-between gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:px-6 lg:px-8"
          style={{ height: "var(--header-height)" }}
        >
          <Link
            href="/"
            className="-mx-1 rounded-lg px-1 text-lg font-bold tracking-tight text-foreground transition-opacity duration-150 hover:opacity-80"
            aria-label="droPINion home"
          >
            droPINion
          </Link>

          <nav aria-label="Account" className="flex items-center gap-1">
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(iconButton, (user || isLoading) && "max-sm:hidden")}
              aria-label="Buy me a coffee (opens in a new tab)"
              title="Buy me a coffee"
            >
              <Coffee />
            </a>

            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowUserSearch(true)}
                  className={iconButton}
                  aria-label="Search people"
                  title="Search people"
                >
                  <Search />
                </button>

                {/* Phones: one avatar menu instead of a row of buttons. */}
                <div className="sm:hidden">
                  <UserMenu
                    name={name}
                    email={user.email}
                    avatarUrl={profile?.avatar_url}
                    isAdmin={isAdmin}
                    isSigningOut={isSigningOut}
                    onSignOut={() => signOut()}
                  />
                </div>

                <div className="hidden items-center gap-1 sm:flex">
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className={cn(iconButton, pathname?.startsWith("/admin") && "bg-primary/10 text-primary")}
                      aria-label="Admin panel"
                      title="Admin panel"
                    >
                      <Shield />
                    </Link>
                  ) : null}

                  <Link
                    href="/profile"
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    className={cn(
                      textButton,
                      "pl-1.5",
                      pathname === "/profile"
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      alt=""
                      size="sm"
                      fallbackText={name}
                      className="size-6 text-[10px]"
                    />
                    <span className="max-w-32 truncate">{name}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => signOut()}
                    disabled={isSigningOut}
                    className={cn(textButton, "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    {isSigningOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                    {isSigningOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </>
            ) : isLoading ? (
              // Reserve the slot while the session resolves (no "Sign in" flash).
              <span aria-hidden className="ml-1 h-9 w-[4.5rem] animate-pulse rounded-xl bg-muted pointer-coarse:h-10" />
            ) : (
              <Link
                href="/auth"
                className={cn(
                  textButton,
                  "ml-1 bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 pointer-coarse:h-10"
                )}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      {user ? <UserSearchDialog open={showUserSearch} onOpenChange={setShowUserSearch} /> : null}
    </>
  );
}
