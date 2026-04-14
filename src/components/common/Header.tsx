"use client";

import { Avatar } from "@/components/ui/Avatar";
import { UserSearchDialog } from "@/components/users/UserSearchDialog";
import { useSession } from "@/hooks/useSession";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2, LogOut, Search, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const { user, signOut, isSigningOut } = useSession();
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const [showUserSearch, setShowUserSearch] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between"
          style={{ height: "var(--header-height)" }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="text-lg font-bold text-foreground hover:text-foreground/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
          >
            <span className="tracking-tight">oPINion</span>
          </Link>

          {/* Spacer */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowUserSearch(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 hover:bg-muted/50 hover:text-foreground active:scale-[0.96]"
                  aria-label="Search users"
                >
                  <Search className="h-4 w-4" />
                </button>

                {/* Desktop user pill */}
                <div className="hidden lg:flex items-center gap-2 bg-muted/40 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-full px-3 py-1.5 mr-1">
                  <Avatar
                    src={profile?.avatar_url}
                    alt={profile?.display_name || user.email || "User"}
                    size="sm"
                    fallbackText={profile?.display_name || user.email}
                  />
                  <span className="text-xs font-medium text-foreground truncate max-w-28">
                    {profile?.display_name || user.email}
                  </span>
                </div>

                {/* Admin */}
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                  <Link
                    href="/admin"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
                    aria-label="Admin panel"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}

                {/* Profile */}
                <Link
                  href="/profile"
                  className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] ${
                    pathname === "/profile"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  aria-label="Profile"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                {/* Sign Out */}
                <button
                  onClick={() => signOut()}
                  disabled={isSigningOut}
                  className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] cursor-pointer disabled:opacity-50"
                  aria-label={isSigningOut ? "Signing out" : "Sign out"}
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isSigningOut ? "Signing Out…" : "Sign Out"}
                  </span>
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
      <UserSearchDialog open={showUserSearch} onOpenChange={setShowUserSearch} />
    </>
  );
}
