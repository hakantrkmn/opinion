import { authClient } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export function useSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionData, isPending: isLoading, error } = authClient.useSession();

  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      console.error("Sign in failed:", error);
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
      const result = await authClient.signUp.email({
        email,
        password,
        name: displayName,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      console.error("Sign up failed:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/");
    },
  });

  // Map Better Auth session to a compatible shape
  const session = sessionData?.session ?? null;
  const user = sessionData?.user ?? null;

  return {
    session,
    user,
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
  };
}
