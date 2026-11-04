"use client";

import { setApiErrorTranslator } from "@/lib/api/error-i18n";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Registers translated API error messages for errorMessage(). English keeps
 * the server's own (more specific) messages.
 */
export function ApiErrorTranslator() {
  const locale = useLocale();
  const t = useTranslations("common.apiErrors");
  useEffect(() => {
    setApiErrorTranslator(locale === "en" ? null : (code) => t(code));
    return () => setApiErrorTranslator(null);
  }, [locale, t]);
  return null;
}
