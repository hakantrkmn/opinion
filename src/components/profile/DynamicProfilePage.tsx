"use client";

import Header from "@/components/common/Header";
import { UserStats } from "@/types";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import ProfileClient to improve loading performance
const ProfileClient = dynamic(
  () =>
    import("../../app/profile/ProfileClient").then((mod) => ({
      default: mod.ProfileClient,
    })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading Profile...</p>
          </div>
        </div>
      </div>
    ),
    ssr: false, // Profile data needs client-side loading anyway
  }
);

interface DynamicProfilePageProps {
  user: User;
  userStats: UserStats;
}

export default function DynamicProfilePage({
  user,
  userStats,
}: DynamicProfilePageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ProfileClient user={user} userStats={userStats} />
      </main>
    </div>
  );
}
