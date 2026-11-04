"use client";

import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { apiSend } from "@/lib/api/send";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** The other language: there are two, so the switch is a toggle. */
function otherLocale(locale: Locale): Locale {
  return LOCALES.find((l) => l !== locale) ?? locale;
}

/**
 * Switches the UI language (cookie + account), then re-renders the server
 * tree so every message updates. `className` styles the trigger.
 */
export function useLocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = otherLocale(locale);
  const switchTo = (target: Locale = next) =>
    startTransition(async () => {
      await apiSend("/api/locale", { method: "POST", json: { locale: target } }).catch(() => undefined);
      router.refresh();
    });
  return { locale, next, nextName: LOCALE_NAMES[next], pending, switchTo };
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { next, nextName, pending, switchTo } = useLocaleSwitch();
  return (
    <button
      type="button"
      onClick={() => switchTo()}
      disabled={pending}
      className={className}
      aria-label={t("switchLanguage", { language: nextName })}
      title={nextName}
      lang={next}
    >
      <Languages aria-hidden />
    </button>
  );
}
