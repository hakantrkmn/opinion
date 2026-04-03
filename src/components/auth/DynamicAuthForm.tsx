"use client";

import dynamic from "next/dynamic";

const AuthForm = dynamic(() => import("./AuthForm"), {
  loading: () => (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  ),
  ssr: false,
});

export default function DynamicAuthForm() {
  return <AuthForm />;
}
