import type { Metadata } from "next";
import Header from "@/components/common/Header";
import { ArrowLeft } from "lucide-react";
import { formatShortDate } from "@/lib/formatters";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PrivacyBodyEn } from "./PrivacyBodyEn";
import { PrivacyBodyTr } from "./PrivacyBodyTr";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: "/privacy",
    },
  };
}

/** ISO date; formatted at noon UTC so it is the same day in every time zone. */
const LAST_UPDATED = "2026-05-01";
const CONTACT_EMAIL = "hakanturkmendev@gmail.com";

export default async function PrivacyPolicyPage() {
  const [t, locale] = await Promise.all([getTranslations("pages.privacy"), getLocale()]);
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-10 flex flex-col gap-3 border-b border-border/60 pb-8">
          <Link
            href="/"
            className="-ml-2 inline-flex h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t("backToMap")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.rich("lastUpdated", {
              date: formatShortDate(new Date(`${LAST_UPDATED}T12:00:00Z`), locale),
              time: (chunks) => <time dateTime={LAST_UPDATED}>{chunks}</time>,
            })}
          </p>
        </header>

        <article className="flex max-w-[68ch] flex-col gap-10 text-[15px] leading-7 text-foreground/85 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-primary/50 [&_a]:underline-offset-4 [&_a:hover]:decoration-primary [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:marker:text-muted-foreground">
          {locale === "tr" ? (
            <PrivacyBodyTr contactEmail={CONTACT_EMAIL} />
          ) : (
            <PrivacyBodyEn contactEmail={CONTACT_EMAIL} />
          )}
        </article>
      </main>
    </div>
  );
}
