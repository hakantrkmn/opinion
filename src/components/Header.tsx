"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Search, Shield, User } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-background border-b border-border shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="font-serif">oPINion</span>
          </Link>

          {/* Search Input - Placeholder for future search functionality */}
          <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pins..."
                className="pl-10 text-sm"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                <div className="hidden lg:flex items-center space-x-2 bg-muted rounded-full px-3 py-1.5">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-foreground">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-foreground font-medium truncate max-w-32">
                    {user.email}
                  </span>
                </div>
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                  <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                    <Link href="/admin">
                      <Shield className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link href="/profile">
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="sm:hidden">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                  </Link>
                </Button>
                <form action="/auth/signout" method="post">
                  <Button type="submit" variant="outline" size="sm" className="text-xs sm:text-sm">
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/auth">
                  <span className="text-xs sm:text-sm">Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
