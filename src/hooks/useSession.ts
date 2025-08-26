import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const supabase = createClient();

  // Hybrid cache manager instance
  const cacheManager = new HybridCacheManager(queryClient);

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<Session | null> => {
      // Önce cache'den kontrol et
      const cachedSession = cacheManager.getSession();
      if (cachedSession) {
        console.log("✅ Session cache hit");
        return cachedSession;
      }

      // Cache'de yoksa Supabase'den al
      console.log("🔄 Fetching session from Supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Session'ı cache'e kaydet
      if (session) {
        cacheManager.cacheSession(session);
        console.log("💾 Session cached");
      }

      return session;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes cache (increased from 5)
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection (increased from 10)
    retry: 1,
  });

  // Session yoksa auth'a yönlendir
  useEffect(() => {
    if (!isLoading && !session && !error) {
      router.push("/auth");
    }
  }, [session, isLoading, error, router]);

  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Session'ı cache'e kaydet
      cacheManager.cacheSession(data.session);
      console.log("✅ Sign in successful, session cached");
      router.push("/");
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      // Cache'i temizle
      cacheManager.clearSession();
      console.log("🗑️ Session cache cleared");
      router.push("/auth");
    },
  });

  return {
    session,
    user: session?.user || null,
    isLoading,
    error,
    signIn: signInMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    // Cache manager'a erişim (debug için)
    cacheManager,
  };
}
