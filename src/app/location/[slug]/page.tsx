import { generateOGMetadata, generateTwitterMetadata } from "@/lib/og-utils";
import { getBaseUrl } from "@/lib/site-url";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generateLocationListSchema,
} from "@/lib/structured-data";
import { searchPinsByName } from "@/server/services/pins/pages";
import { formatShortDate } from "@/lib/formatters";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { ChevronRight, Compass, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

/** The slug as text, or null for a malformed percent-encoding. */
function safeDecode(slug: string): string | null {
  try {
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locationName = safeDecode(slug);
  // A malformed slug renders the 404 page; keep it out of the index.
  if (locationName === null) return { robots: { index: false, follow: true } };
  const baseUrl = getBaseUrl();
  const t = await getTranslations("pages.location");

  const title = t("title", { location: locationName });
  const description = t("description", { location: locationName });

  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "location",
    baseUrl,
  });

  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "location",
    baseUrl,
  });

  return {
    title,
    description,
    // Any substring of any pin name renders a page here, so these are
    // search results rather than real places: let crawlers follow the pin
    // links, but don't index the pages themselves.
    robots: { index: false, follow: true },
    openGraph: {
      ...ogMetadata,
      url: `/location/${encodeURIComponent(locationName)}`,
    },
    twitter: twitterMetadata,
    alternates: {
      canonical: `/location/${encodeURIComponent(locationName)}`,
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locationName = safeDecode(slug);
  if (locationName === null) notFound();
  const baseUrl = getBaseUrl();

  // Pins whose name contains the location (trigram index, LIKE-escaped)
  const [locationPins, t, tShared, locale] = await Promise.all([
    searchPinsByName(locationName, 50),
    getTranslations("pages.location"),
    getTranslations("pages.shared"),
    getLocale(),
  ]);

  if (locationPins.length === 0) {
    notFound();
  }

  const locationSchema = generateLocationListSchema(
    t("title", { location: locationName }),
    locationName,
    locationPins.map((p) => ({ id: p.id, name: p.name })),
    { baseUrl }
  );
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: tShared("home"), url: "/" },
      {
        name: locationName,
        url: `/location/${encodeURIComponent(locationName)}`,
      },
    ],
    { baseUrl }
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(locationSchema)}
      />
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
            <span className="truncate text-foreground/80" aria-current="page">
              {locationName}
            </span>
          </nav>

          <header className="mb-8 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-sm">
              <PinIcon className="size-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance [overflow-wrap:anywhere] sm:text-3xl">
                {t("title", { location: locationName })}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {locationPins.length >= 50
                  ? t("placesMany", { location: locationName })
                  : t("placesCount", { count: locationPins.length, location: locationName })}
              </p>
            </div>
          </header>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locationPins.map((pin) => (
              <li key={pin.id}>
                <article className="group relative flex h-full flex-col rounded-2xl border border-border/60 bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-border hover:shadow-float">
                  <h2 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                    <Link
                      href={`/pin/${pin.id}`}
                      className="rounded after:absolute after:inset-0 after:rounded-2xl after:content-['']"
                    >
                      {pin.name}
                    </Link>
                  </h2>
                  <footer className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
                    {pin.displayName ? (
                      <span className="flex min-w-0 items-center gap-2">
                        {pin.avatarUrl ? (
                          <img
                            src={pin.avatarUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 shrink-0 rounded-full bg-muted object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <span className="truncate">{t("by", { name: pin.displayName })}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <time dateTime={new Date(pin.createdAt).toISOString()} className="shrink-0 tabular-nums">
                      {formatShortDate(new Date(pin.createdAt), locale)}
                    </time>
                  </footer>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              {t("cta", { location: locationName })}
            </p>
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {t("openMap")}
            </Link>
            <Link
              href="/explore"
              className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-medium text-muted-foreground transition-[transform,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.97] sm:ml-2 sm:mt-0"
            >
              <Compass className="h-4 w-4" aria-hidden />
              {t("explore")}
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
