import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getServerSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  // Signed-in users change their password from profile settings instead.
  if (await getServerSession()) redirect("/profile");
  const params = await searchParams;
  const raw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  return <ForgotPasswordForm redirectTo={safeRedirectPath(raw)} />;
}
