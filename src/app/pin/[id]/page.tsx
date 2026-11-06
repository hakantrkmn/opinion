import { generateOGMetadata, generateTwitterMetadata } from "@/lib/og-utils";
import { siteOpenGraph } from "@/lib/site-metadata";
import { getBaseUrl } from "@/lib/site-url";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generatePinDiscussionSchema,
  generatePlaceSchema,
} from "@/lib/structured-data";
import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import {
  getNearbyPins,
  getPinPageComments,
  getPinPageData,
  getPinShareQuote,
} from "@/server/services/pins/pages";
import { formatRelativeDateTime, formatShortDate } from "@/lib/formatters";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Compass,
  MessageCircle,
  MapPin,
  MapPinCheck,
  ThumbsUp,
  ThumbsDown,
  User,
} from "lucide-react";
import { PinPageComposer } from "./PinPageComposer";
import ShareButton from "./ShareButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = getBaseUrl();

  const [pin, quote, t, siteOg] = await Promise.all([
    getPinPageData(id),
    getPinShareQuote(id),
    getTranslations("pages.pin"),
    siteOpenGraph(),
  ]);

  if (!pin) {
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
      robots: { index: false, follow: false },
    };
  }

  const pinName = pin.name || t("thisPlace");
  const title = t("reviewsOf", { name: pinName });
  // Link previews quote the pin's best opinion (same one as the image).
  const description = quote
    ? t("quoteDescription", {
        quote: quote.text.length > 140 ? `${quote.text.slice(0, 139).trimEnd()}…` : quote.text,
        name: quote.displayName,
        count: pin.commentsCount,
      })
    : t("description", { name: pinName });
  const locationName = pin.name || t("unknownLocation");
  const imageUrl = `${baseUrl}/api/og/pin/${encodeURIComponent(id)}`;

  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
    imageUrl,
  });

  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
    imageUrl,
  });

  return {
    title,
    description,
    openGraph: {
      siteName: siteOg.siteName,
      locale: siteOg.locale,
      ...ogMetadata,
      url: `/pin/${id}`,
      publishedTime: pin.createdAt.toISOString(),
      modifiedTime: pin.updatedAt.toISOString(),
    },
    twitter: twitterMetadata,
    alternates: {
      canonical: `/pin/${id}`,
    },
  };
}

export default async function PinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseUrl = getBaseUrl();

  const [pin, t, tShared, locale] = await Promise.all([
    getPinPageData(id),
    getTranslations("pages.pin"),
    getTranslations("pages.shared"),
    getLocale(),
  ]);

  if (!pin) {
    notFound();
  }

  const [pinComments, nearbyPins] = await Promise.all([
    getPinPageComments(id),
    getNearbyPins(pin.id, pin.lat, pin.lng).catch((error) => {
      console.error("[pin page] nearby pins failed:", error);
      return [];
    }),
  ]);

  const lat = pin.lat;
  const lng = pin.lng;
  const mapUrl = `/?pin=${encodeURIComponent(pin.id)}&lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
  const shareUrl = `${baseUrl}/pin/${id}`;

  const pinSchema =
    generatePinDiscussionSchema(pin, pinComments, { baseUrl, mapUrl }, t("anonymous")) ??
    generatePlaceSchema(
      { id: pin.id, name: pin.name, latitude: lat, longitude: lng, hasMap: `${baseUrl}${mapUrl}` },
      { baseUrl }
    );
  const kilometers = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilometer",
    maximumFractionDigits: 1,
  });
  const meters = new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 });
  /** "40 m" under a kilometre (10 m steps), "2.4 km" above. */
  const formatDistance = (m: number) =>
    m < 1000 ? meters.format(Math.max(10, Math.round(m / 10) * 10)) : kilometers.format(m / 1000);
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: tShared("home"), url: "/" },
      { name: pin.name || t("pinDetailsSchema"), url: `/pin/${id}` },
    ],
    { baseUrl }
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(pinSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(breadcrumbSchema)}
      />

      <div className="min-h-[100dvh] bg-background">
        <Header />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
          {/* Breadcrumb */}
          <nav aria-label={tShared("breadcrumb")} className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Link href="/" className="rounded hover:text-foreground transition-colors duration-150">
              {tShared("home")}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground/80" aria-current="page">{t("pinDetails")}</span>
          </nav>

          {/* Pin Header */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-sm">
                <PinIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight text-balance [overflow-wrap:anywhere]">
                  {t("reviewsOf", { name: pin.name || t("untitledPin") })}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5 tabular-nums">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("commentsCount", { count: pinComments.length })}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatShortDate(new Date(pin.createdAt), locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {pin.avatarUrl ? (
                <img
                  src={pin.avatarUrl}
                  alt={pin.displayName || t("user")}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  decoding="async"
                />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {pin.displayName || t("anonymous")}
              </p>
              <p className="text-xs text-muted-foreground">{t("droppedThisPin")}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <Link
              href={mapUrl}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] hover:bg-primary/90"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {t("seeOnMap")}
            </Link>
            <ShareButton url={shareUrl} pinName={pin.name} />
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground transition-[transform,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.97]"
            >
              <Compass className="h-4 w-4" aria-hidden />
              {t("exploreMore")}
            </Link>
          </div>

          <div className="mb-10">
            <PinPageComposer
              pinId={pin.id}
              pinName={pin.name || t("thisPlace")}
              commentsCount={pin.commentsCount}
            />
          </div>

          {/* Comments */}
          <section aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="text-base font-semibold text-foreground mb-4">
              {t.rich("commentsHeading", {
                count: pinComments.length,
                muted: (chunks) => (
                  <span className="font-normal text-muted-foreground tabular-nums">{chunks}</span>
                ),
              })}
            </h2>

            {pinComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <MessageCircle className="size-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{t("noComments")}</h3>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  {t("beFirst")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pinComments.map((comment) => (
                  <article
                    key={comment.id}
                    id={`c-${comment.id}`}
                    className="scroll-mt-20 p-4 rounded-2xl border border-border/60 bg-card"
                  >
                    {/* Comment Header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {comment.avatarUrl ? (
                          <img
                            src={comment.avatarUrl}
                            alt={comment.displayName || t("user")}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate block leading-tight">
                          {comment.displayName || t("anonymous")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeDateTime(new Date(comment.createdAt), locale)}
                        </span>
                      </div>
                      {comment.verifiedVisit && (
                        <span
                          title={t("writtenOnSite")}
                          className="flex flex-shrink-0 items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                          <MapPinCheck className="size-3" aria-hidden />
                          {t("wasHere")}
                        </span>
                      )}
                      {comment.isFirstComment && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md flex-shrink-0">
                          {t("op")}
                        </span>
                      )}
                    </div>

                    {/* Comment Text */}
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
                      {comment.text}
                    </p>

                    {/* Comment Photo */}
                    {comment.photoUrl && (
                      <div className="mt-3">
                        <img
                          src={comment.photoUrl}
                          alt={t("commentPhoto")}
                          width={400}
                          height={300}
                          className="aspect-[4/3] w-full max-w-sm rounded-xl border border-border/40 bg-muted object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    {/* Votes */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={t("likes", { count: Number(comment.likeCount) })}>
                        <ThumbsUp className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{Number(comment.likeCount)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={t("dislikes", { count: Number(comment.dislikeCount) })}>
                        <ThumbsDown className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{Number(comment.dislikeCount)}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {nearbyPins.length > 0 && (
            <section aria-labelledby="nearby-heading" className="mt-12">
              <h2 id="nearby-heading" className="text-base font-semibold text-foreground mb-4 [overflow-wrap:anywhere]">
                {t("nearbyHeading", { name: pin.name || t("thisPlace") })}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {nearbyPins.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pin/${p.id}`}
                      className="flex h-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-[border-color,box-shadow] duration-150 hover:border-border hover:shadow-float"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                        <PinIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {p.name || t("untitledPin")}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {t("nearbyMeta", {
                            count: p.commentsCount,
                            distance: formatDistance(p.distanceM),
                          })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </main>
      </div>
    </>
  );
}
