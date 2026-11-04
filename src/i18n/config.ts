/**
 * UI languages. There is no locale in the URL: the choice lives in the
 * NEXT_LOCALE cookie (set from the language switcher, mirrored to
 * user.locale for push / email), falling back to Accept-Language.
 */
export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
/** One year. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", tr: "Türkçe" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Best supported language from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) : 1, index };
    })
    .filter((r) => r.lang && Number.isFinite(r.q) && r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.map((r) => r.lang).find(isLocale) ?? DEFAULT_LOCALE;
}

export function resolveLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  return isLocale(input.cookie) ? input.cookie : negotiateLocale(input.acceptLanguage);
}
