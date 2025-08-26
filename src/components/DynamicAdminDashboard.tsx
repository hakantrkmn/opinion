"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import AdminDashboard to reduce initial bundle size
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    </div>
  ),
  ssr: false, // Admin dashboard doesn't need SSR
});

export default function DynamicAdminDashboard() {
  return <AdminDashboard />;
}