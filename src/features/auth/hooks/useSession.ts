"use client";

import { AuthClientError } from "@/features/auth/lib/auth-errors";
import { authClient } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type SignInInput = { email: string; password: string; redirectTo?: string };
type SignUpInput = SignInInput & { displayName: string };

export function useSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionData, isPending: isLoading, error } = authClient.useSession();

  const finishAuth = (redirectTo?: string) => {
    queryClient.clear();
    router.replace(safeRedirectPath(redirectTo));
    router.refresh();
  };

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) throw new AuthClientError(result.error);
      return result.data;
    },
    onSuccess: (_data, { redirectTo }) => finishAuth(redirectTo),
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, displayName }: SignUpInput) => {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: displayName.trim(),
      });
      if (result.error) throw new AuthClientError(result.error);
      return result.data;
    },
    onSuccess: (_data, { redirectTo }) => finishAuth(redirectTo),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSettled: () => {
      queryClient.clear();
      router.replace("/");
      router.refresh();
    },
  });

  return {
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
    isLoading,
    error,
    signIn: signInMutation.mutate,
    signUp: signUpMutation.mutate,
    signOut: () => signOutMutation.mutate(),
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    resetErrors: () => {
      signInMutation.reset();
      signUpMutation.reset();
    },
  };
}
