import AuthForm from "@/features/auth/components/AuthForm";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getServerSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[]; mode?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(first(params.redirect));

  // Already signed in: go straight to where the user was heading.
  if (await getServerSession()) redirect(redirectTo);

  return (
    <AuthForm
      redirectTo={redirectTo}
      initialMode={first(params.mode) === "signup" ? "signup" : "signin"}
    />
  );
}
