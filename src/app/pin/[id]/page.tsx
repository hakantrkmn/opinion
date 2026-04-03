import {
  generateLocationKeywords,
  generateOGMetadata,
  generateTwitterMetadata,
} from "@/lib/og-utils";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generatePlaceSchema,
} from "@/lib/structured-data";
import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { db } from "@/db";
import { pins, comments, commentVotes } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, asc, sql } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  ThumbsUp,
  ThumbsDown,
  User,
} from "lucide-react";
import ShareButton from "./ShareButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const [pin] = await db
    .select({
      id: pins.id,
      name: pins.name,
      location: sql<{ type: string; coordinates: [number, number] }>`ST_AsGeoJSON(${pins.location})::jsonb`.as("location"),
      createdAt: pins.createdAt,
      updatedAt: pins.updatedAt,
    })
    .from(pins)
    .where(eq(pins.id, id));

  if (!pin) {
    return {
      title: "Pin Not Found | oPINion",
      description: "The requested pin could not be found.",
    };
  }

  const title = pin.name || "Pin Details";
  const description = `Discover opinions and thoughts about ${pin.name}. Read what the community thinks about this location on oPINion.`;
  const locationName = pin.name || "Unknown Location";

  const ogMetadata = generateOGMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
  });

  const twitterMetadata = generateTwitterMetadata({
    title,
    description,
    location: locationName,
    type: "pin",
    baseUrl,
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
      authors: ["oPINion Community"],
    },
    twitter: twitterMetadata,
    other: {
      "geo.placename": locationName,
      "geo.region": locationName,
      "article:author": "oPINion Community",
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
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";

  const [pin] = await db
    .select({
      id: pins.id,
      name: pins.name,
      location: sql<{ type: string; coordinates: [number, number] }>`ST_AsGeoJSON(${pins.location})::jsonb`.as("location"),
      createdAt: pins.createdAt,
      updatedAt: pins.updatedAt,
      userId: pins.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(pins)
    .leftJoin(user, eq(pins.userId, user.id))
    .where(eq(pins.id, id));

  if (!pin) {
    notFound();
  }

  const pinComments = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      isFirstComment: comments.isFirstComment,
      photoUrl: comments.photoUrl,
      userId: comments.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      likeCount: sql<number>`COALESCE((SELECT COUNT(*) FROM comment_votes WHERE comment_votes.comment_id = ${comments.id} AND comment_votes.value = 1), 0)`,
      dislikeCount: sql<number>`COALESCE((SELECT COUNT(*) FROM comment_votes WHERE comment_votes.comment_id = ${comments.id} AND comment_votes.value = -1), 0)`,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.pinId, id))
    .orderBy(asc(comments.createdAt));

  const coordinates = pin.location?.coordinates;
  const lat = coordinates?.[1];
  const lng = coordinates?.[0];
  const mapUrl = lat && lng ? `/?lat=${lat.toFixed(6)}&long=${lng.toFixed(6)}` : "/";
  const shareUrl = `${baseUrl}/pin/${id}`;

  const pinData = {
    id: pin.id,
    name: pin.name,
    location: pin.location,
    created_at: pin.createdAt.toISOString(),
    updated_at: pin.updatedAt.toISOString(),
  };

  const placeSchema = generatePlaceSchema(pinData, { baseUrl });
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
      { name: "Pins", url: "/pins" },
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

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mb-6 animate-[fadeSlideIn_0.4s_ease_both]">
            <Link href="/" className="hover:text-foreground transition-colors duration-300">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/80">Pin Details</span>
          </nav>

          {/* Pin Header */}
          <div className="mb-8 animate-[fadeSlideIn_0.4s_ease_both]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-emerald-500 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)] flex items-center justify-center">
                <PinIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                  {pin.name || "Untitled Pin"}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-muted-foreground/60 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {pinComments.length} {pinComments.length === 1 ? "comment" : "comments"}
                  </span>
                  <span className="text-sm text-muted-foreground/60 flex items-center gap-1.5">
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
          <div className="flex items-center gap-3 mb-6 animate-[fadeSlideIn_0.4s_ease_0.05s_both]">
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
              <p className="text-xs text-muted-foreground/60">Pin author</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-8 animate-[fadeSlideIn_0.4s_ease_0.1s_both]">
            <Link
              href={mapUrl}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] hover:opacity-90"
            >
              <Navigation className="h-3.5 w-3.5" />
              See on Map
            </Link>
            <ShareButton url={shareUrl} pinName={pin.name} />
          </div>

          {/* Comments */}
          <div className="animate-[fadeSlideIn_0.4s_ease_0.15s_both]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
              Comments ({pinComments.length})
            </h2>

            {pinComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">No comments yet</h3>
                <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                  Open this pin on the map to leave your opinion
                </p>
                <Link
                  href={mapUrl}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-600 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
                >
                  Go to Map
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pinComments.map((comment, index) => (
                  <article
                    key={comment.id}
                    className="p-4 rounded-2xl border border-border/40 hover:border-border/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ animationDelay: `${(index + 3) * 50}ms` }}
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
                        <span className="text-[11px] text-muted-foreground/60">
                          {new Date(comment.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {comment.isFirstComment && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
                          OP
                        </span>
                      )}
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm leading-relaxed text-foreground/90 break-all overflow-hidden">
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
                          className="rounded-xl border border-border/30 max-h-64 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    {/* Votes */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                        <ThumbsUp className="h-3 w-3" />
                        <span className="tabular-nums">{Number(comment.likeCount)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                        <ThumbsDown className="h-3 w-3" />
                        <span className="tabular-nums">{Number(comment.dislikeCount)}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="mt-10 p-6 rounded-2xl border border-border/40 text-center animate-[fadeSlideIn_0.4s_ease_0.2s_both]">
            <p className="text-sm text-muted-foreground mb-3">
              Want to share your opinion about this place?
            </p>
            <Link
              href={mapUrl}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] hover:opacity-90"
            >
              <Navigation className="h-4 w-4" />
              Open on Map
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
