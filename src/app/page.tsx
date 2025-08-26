"use client";
import ClientMapWrapper from "@/components/ClientMapWrapper";
import Header from "@/components/Header";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useSession();

  // Loading durumunda spinner göster
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // User yoksa auth sayfasına yönlendir (useSession hook'u zaten yapıyor)
  if (!user) {
    return null; // useSession hook auth'a yönlendirecek
  }

  // User varsa ana sayfayı göster
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        <ClientMapWrapper />
      </main>
    </div>
  );
}
