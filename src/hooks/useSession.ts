import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
      // Session query'de cache kullanma (problem oluşturuyor)
      // Sadece başarılı login'de cache'e kaydet
      // Fetching session from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return session;
    },
    staleTime: 0, // Auth sayfasında fresh session kontrolü
    gcTime: 5 * 60 * 1000, // 5 dakika garbage collection
    retry: 1,
    enabled: true, // Her zaman session kontrolü yap
  });

  // Middleware zaten auth redirection'ı server-side yapıyor
  // Client-side redirect'e gerek yok

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
      // Başarılı girişte cache'e kaydet ve query cache'i güncelle
      cacheManager.cacheSession(data.session);

      // Session query'yi güncelle (selective caching)
      queryClient.setQueryData(["session"], data.session);

      // Query cache'i enable et başarılı login sonrası
      queryClient.setQueryDefaults(["session"], {
        staleTime: 15 * 60 * 1000, // 15 dakika cache
        gcTime: 30 * 60 * 1000, // 30 dakika GC
      });

      // Sign in successful, session cached
      router.push("/");
    },
    onError: (error) => {
      console.error("❌ Sign in failed:", error);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Başarılı sign up'ta cache'e kaydet
      if (data.session) {
        cacheManager.cacheSession(data.session);

        // Session query'yi güncelle (selective caching)
        queryClient.setQueryData(["session"], data.session);

        // Query cache'i enable et başarılı signup sonrası
        queryClient.setQueryDefaults(["session"], {
          staleTime: 15 * 60 * 1000, // 15 dakika cache
          gcTime: 30 * 60 * 1000, // 30 dakika GC
        });

        // Sign up successful, session cached
        router.push("/");
      } else {
        // Email confirmation gerekiyorsa
        // Email confirmation required
      }
    },
    onError: (error) => {
      console.error("❌ Sign up failed:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      // Sign out'ta cache'i temizle
      cacheManager.clearSession();
      // Session cache cleared
      router.push("/auth");
    },
  });

  return {
    session,
    user: session?.user || null,
    isLoading,
    error,
    signIn: signInMutation.mutate,
    signUp: signUpMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    // Cache manager'a erişim (debug için)
    cacheManager,
  };
}
