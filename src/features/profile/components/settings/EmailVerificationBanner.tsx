"use client";

import { Button } from "@/components/ui/button";
import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";

/** Non-blocking reminder shown on the profile while the email is unverified. */
export function EmailVerificationBanner({ onVerify }: { onVerify: () => void }) {
  const t = useTranslations("profile.verifyBanner");
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-start gap-3">
        <MailWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">{t("title")}</p>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>
      <Button variant="outline" className="h-10 rounded-xl" onClick={onVerify}>
        {t("action")}
      </Button>
    </div>
  );
}
