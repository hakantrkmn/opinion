import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

const OG_LOCALE = { en: "en_US", tr: "tr_TR" } as const;

/** Default share image (1200x630). */
export const DEFAULT_OG_IMAGE = "/api/og?type=default";

/**
 * Site-wide Open Graph defaults. A page's `openGraph` replaces the layout's
 * as a whole (no deep merge), so pages spread this and add their own
 * title / description / url.
 *
 * Kept apart from og-utils.ts so the /api/og routes don't pull in next-intl.
 */
export async function siteOpenGraph(): Promise<NonNullable<Metadata["openGraph"]>> {
  const [t, locale] = await Promise.all([getTranslations("pages.layout"), getLocale()]);
  return {
    type: "website",
    locale: OG_LOCALE[locale],
    siteName: "droPINion",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: t("ogImageAlt") }],
  };
}
