import AuthForm from "@/components/AuthForm";
import { getServerSession } from "@/lib/supabase/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

// Auth sayfası SEO ayarları
export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your oPINion account",
  robots: {
    index: false,
    follow: false,
  },
};

// Server Component - %20-30 hızlanma
export default async function AuthPage() {
  // Server-side session kontrolü - çok hızlı
  const session = await getServerSession();

  // Zaten giriş yapmışsa ana sayfaya yönlendir
  if (session) {
    redirect('/');
  }

  return <AuthForm />;
}
