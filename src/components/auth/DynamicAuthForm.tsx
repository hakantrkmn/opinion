"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import AuthForm to reduce initial bundle size
// This prevents auth-related components from being loaded until needed
const AuthForm = dynamic(() => import("./AuthForm"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading login form...</span>
      </div>
    </div>
  ),
  ssr: false, // Auth form doesn't need SSR since it requires client-side auth
});

export default function DynamicAuthForm() {
  return <AuthForm />;
}
