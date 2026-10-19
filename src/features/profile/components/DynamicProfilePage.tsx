"use client";

import Header from "@/components/common/Header";
import { ProfileHeroSkeleton } from "@/features/profile/components/sections/ProfileHero";
import type { OwnProfileResponse } from "@/types/userTypes";
import dynamic from "next/dynamic";

/** Matches the loaded layout (hero + tabs + rows) so nothing jumps. */
function ProfilePageSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 sm:px-6 sm:pt-10">
      <ProfileHeroSkeleton />
      <div className="h-11 animate-pulse rounded-xl bg-muted/60" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

const ProfileClient = dynamic(
  () => import("@/app/profile/ProfileClient").then((mod) => ({ default: mod.ProfileClient })),
  { loading: ProfilePageSkeleton, ssr: false }
);

export default function DynamicProfilePage({ initial }: { initial: OwnProfileResponse }) {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main>
        <ProfileClient initial={initial} />
      </main>
    </div>
  );
}
