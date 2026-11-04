import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getServerSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta");
  return { title: t("resetPassword") };
}

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
