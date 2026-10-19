"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

/** Mirrors the dashboard's header, stat tiles and tabs so nothing jumps. */
function AdminSkeleton() {
  return (
    <div aria-busy className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <span className="sr-only">Loading admin dashboard…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[90px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-xl rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

const AdminDashboard = dynamic(() => import("@/features/admin/components/AdminDashboard"), {
  loading: AdminSkeleton,
  ssr: false,
});

export default function DynamicAdminDashboard() {
  return <AdminDashboard />;
}
