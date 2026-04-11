"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
  ssr: false,
});

export default function DynamicAdminDashboard() {
  return <AdminDashboard />;
}