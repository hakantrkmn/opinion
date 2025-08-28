"use client";
import DynamicAuthForm from "@/components/DynamicAuthForm";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  // User zaten giriş yapmışsa ana sayfaya yönlendir
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  // Loading durumunda hafif spinner göster
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Checking session...
          </span>
        </div>
      </div>
    );
  }

  // User varsa null döndür (useEffect yönlendirecek)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Redirecting...</span>
        </div>
      </div>
    );
  }

  // User yoksa auth formunu göster (dynamic import ile)
  return <DynamicAuthForm />;
}
