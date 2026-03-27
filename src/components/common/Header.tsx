"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "@/hooks/useSession";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user, signOut, isSigningOut } = useSession();
  const { profile } = useUserProfile();
  const pathname = usePathname();

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg font-bold text-foreground hover:text-foreground/80 transition-colors"
          >
            <span className="tracking-tight">oPINion</span>
          </Link>

          {/* Spacer */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                {/* Desktop user pill */}
                <div className="hidden lg:flex items-center gap-2 bg-muted/40 rounded-full px-3 py-1.5 mr-1">
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
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Admin panel"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}

                {/* Profile */}
                <Link
                  href="/profile"
                  className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors ${
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
                  className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label={isSigningOut ? "Signing out" : "Sign out"}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {isSigningOut ? "Signing Out…" : "Sign Out"}
                  </span>
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="h-8 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-medium flex items-center transition-all shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
