import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { formatShortDate } from "@/lib/formatters";
import { DEFAULT_OG_IMAGE, siteOpenGraph } from "@/lib/site-metadata";
import { getBaseUrl } from "@/lib/site-url";
import { createJsonLdScript, generateBreadcrumbSchema } from "@/lib/structured-data";
import { getExplorePins, type ExplorePin } from "@/server/services/pins/pages";
import { ChevronRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

/**
 * Crawlable hub for public pins: the home page is a client-side map with no
 * links in its HTML, so this is how search engines (and people) reach the
 * pin pages. Linked from the header on every page.
 */

const SECTION_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  const [t, openGraph] = await Promise.all([getTranslations("pages.explore"), siteOpenGraph()]);
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: { canonical: "/explore" },
    openGraph: { ...openGraph, url: "/explore", title, description },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function ExplorePage() {
  const [t, tShared, locale] = await Promise.all([
    getTranslations("pages.explore"),
    getTranslations("pages.shared"),
    getLocale(),
  ]);

  const [discussed, recent] = await Promise.all([
    getExplorePins("discussed", SECTION_SIZE),
    getExplorePins("recent", SECTION_SIZE),
  ]).catch((error) => {
    console.error("[explore] Failed to load pins:", error);
    return [[], []] as ExplorePin[][];
  });

  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: tShared("home"), url: "/" },
      { name: t("breadcrumb"), url: "/explore" },
    ],
    { baseUrl: getBaseUrl() }
  );

  const sections = [
    { id: "most-discussed", title: t("mostDiscussed"), pins: discussed },
    { id: "recently-pinned", title: t("recentlyPinned"), pins: recent },
  ].filter((s) => s.pins.length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(breadcrumbSchema)}
      />

      <div className="min-h-dvh bg-background">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6">
          <nav
            aria-label={tShared("breadcrumb")}
            className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link href="/" className="rounded transition-colors duration-150 hover:text-foreground">
              {tShared("home")}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground/80" aria-current="page">
              {t("breadcrumb")}
            </span>
          </nav>

          <header className="mb-10 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-sm">
              <PinIcon className="size-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
                {t("h1")}
              </h1>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {t("intro")}
              </p>
            </div>
          </header>

          {sections.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id} className="mb-12">
                <h2 id={section.id} className="mb-4 text-base font-semibold text-foreground">
                  {section.title}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.pins.map((pin) => (
                    <li key={pin.id}>
                      <article className="group relative flex h-full flex-col rounded-2xl border border-border/60 bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-border hover:shadow-float">
                        <h3 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                          <Link
                            href={`/pin/${pin.id}`}
                            className="rounded after:absolute after:inset-0 after:rounded-2xl after:content-['']"
                          >
                            {pin.name || t("untitledPin")}
                          </Link>
                        </h3>
                        {pin.quote ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/75 [overflow-wrap:anywhere]">
                            {pin.quote}
                          </p>
                        ) : null}
                        <footer className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
                          <span className="tabular-nums">{t("opinions", { count: pin.commentsCount })}</span>
                          <time dateTime={pin.createdAt} className="shrink-0 tabular-nums">
                            {formatShortDate(new Date(pin.createdAt), locale)}
                          </time>
                        </footer>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">{t("cta")}</p>
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {t("openMap")}
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
