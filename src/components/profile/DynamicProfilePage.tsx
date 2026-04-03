"use client";

import Header from "@/components/common/Header";
import { UserStats } from "@/types";
import dynamic from "next/dynamic";

const ProfileClient = dynamic(
  () =>
    import("../../app/profile/ProfileClient").then((mod) => ({
      default: mod.ProfileClient,
    })),
  {
    loading: () => (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Profile hero skeleton */}
        <div className="relative mb-8 px-6 pt-8 pb-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-6 w-40 bg-muted animate-pulse rounded-md" />
              <div className="h-3.5 w-52 bg-muted/60 animate-pulse rounded-md" />
              <div className="flex gap-4 mt-3">
                <div className="h-4 w-16 bg-muted/50 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted/50 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted/50 animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        </div>
        {/* Tabs skeleton */}
        <div className="h-11 w-full bg-muted/40 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface DynamicProfilePageProps {
  user: { id: string; email: string; name?: string; image?: string | null };
  userStats: UserStats;
}

export default function DynamicProfilePage({
  user,
  userStats,
}: DynamicProfilePageProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main>
        <ProfileClient user={user} userStats={userStats} />
      </main>
    </div>
  );
}
