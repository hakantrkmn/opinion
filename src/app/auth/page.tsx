"use client";
import DynamicAuthForm from "@/components/auth/DynamicAuthForm";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">
            {user ? "Redirecting..." : "Checking session..."}
          </span>
        </div>
      </div>
    );
  }

  return <DynamicAuthForm />;
}
