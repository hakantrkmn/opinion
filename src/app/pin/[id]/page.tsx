import {
  generateLocationKeywords,
  generateOGMetadata,
  generateTwitterMetadata,
} from "@/lib/og-utils";
import { getBaseUrl } from "@/lib/site-url";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generatePlaceSchema,
} from "@/lib/structured-data";
import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import {
  getPinPageComments,
  getPinPageData,
  getPinShareQuote,
} from "@/server/services/pins/pages";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
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

  const [pin, quote] = await Promise.all([getPinPageData(id), getPinShareQuote(id)]);

  if (!pin) {
    return {
      title: "Pin Not Found",
      description: "The requested pin could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const pinName = pin.name || "this place";
  const title = `Reviews of ${pinName}`;
  // Link previews quote the pin's best opinion (same one as the image).
  const opinions = `${pin.commentsCount} ${pin.commentsCount === 1 ? "opinion" : "opinions"}`;
  const description = quote
    ? `“${quote.text.length > 140 ? `${quote.text.slice(0, 139).trimEnd()}…` : quote.text}” — ${quote.displayName} · ${opinions} on droPINion`
    : `Discover opinions and thoughts about ${pinName}. Read what the community thinks about this location on droPINion.`;
  const locationName = pin.name || "Unknown Location";
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

  const locationKeywords = generateLocationKeywords(locationName);

  return {
    title,
    description,
    keywords: [
      "opinion",
      "pin",
      "location",
      "review",
      "thoughts",
      locationName,
      ...locationKeywords,
    ],
    openGraph: {
      ...ogMetadata,
      url: `/pin/${id}`,
      publishedTime: pin.createdAt.toISOString(),
      authors: ["droPINion Community"],
    },
    twitter: twitterMetadata,
    other: {
      "geo.placename": locationName,
      "geo.region": locationName,
      "article:author": "droPINion Community",
      "article:published_time": pin.createdAt.toISOString(),
      "og:locality": locationName,
    },
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

  const pin = await getPinPageData(id);

  if (!pin) {
    notFound();
  }

  const pinComments = await getPinPageComments(id);

  const lat = pin.lat;
  const lng = pin.lng;
  const mapUrl = `/?pin=${encodeURIComponent(pin.id)}&lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
  const shareUrl = `${baseUrl}/pin/${id}`;

  const pinData = {
    id: pin.id,
    name: pin.name,
    location: pin.name,
    latitude: lat,
    longitude: lng,
  };

  const placeSchema = generatePlaceSchema(pinData, { baseUrl });
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: pin.name || "Pin Details", url: `/pin/${id}` },
    ],
    { baseUrl }
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(placeSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(breadcrumbSchema)}
      />

      <div className="min-h-[100dvh] bg-background">
        <Header />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Link href="/" className="rounded hover:text-foreground transition-colors duration-150">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground/80" aria-current="page">Pin details</span>
          </nav>

          {/* Pin Header */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-sm">
                <PinIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight text-balance [overflow-wrap:anywhere]">
                  Reviews of {pin.name || "Untitled Pin"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5 tabular-nums">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {pinComments.length} {pinComments.length === 1 ? "comment" : "comments"}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(pin.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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
                  alt={pin.displayName || "User"}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {pin.displayName || "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground">Dropped this pin</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <Link
              href={mapUrl}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] hover:bg-primary/90"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              See on map
            </Link>
            <ShareButton url={shareUrl} pinName={pin.name} />
          </div>

          <div className="mb-10">
            <PinPageComposer
              pinId={pin.id}
              pinName={pin.name || "this place"}
              commentsCount={pin.commentsCount}
            />
          </div>

          {/* Comments */}
          <section aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="text-base font-semibold text-foreground mb-4">
              Comments <span className="font-normal text-muted-foreground tabular-nums">({pinComments.length})</span>
            </h2>

            {pinComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <MessageCircle className="size-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">No comments yet</h3>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Be the first to share your opinion above.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pinComments.map((comment) => (
                  <article
                    key={comment.id}
                    className="p-4 rounded-2xl border border-border/60 bg-card"
                  >
                    {/* Comment Header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {comment.avatarUrl ? (
                          <img
                            src={comment.avatarUrl}
                            alt={comment.displayName || "User"}
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
                          {comment.displayName || "Anonymous"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {comment.verifiedVisit && (
                        <span
                          title="Written on site"
                          className="flex flex-shrink-0 items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                          <MapPinCheck className="size-3" aria-hidden />
                          Was here
                        </span>
                      )}
                      {comment.isFirstComment && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md flex-shrink-0">
                          OP
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
                          alt="Comment photo"
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
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`${Number(comment.likeCount)} likes`}>
                        <ThumbsUp className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{Number(comment.likeCount)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`${Number(comment.dislikeCount)} dislikes`}>
                        <ThumbsDown className="h-3 w-3" aria-hidden />
                        <span className="tabular-nums">{Number(comment.dislikeCount)}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </>
  );
}
