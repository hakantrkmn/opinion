import {
  generateLocationKeywords,
  generateOGMetadata,
  generateTwitterMetadata,
} from "@/lib/og-utils";
import { getBaseUrl } from "@/lib/site-url";
import {
  createJsonLdScript,
  generateBreadcrumbSchema,
  generateLocationSchema,
} from "@/lib/structured-data";
import { searchPinsByName } from "@/server/services/pins/pages";
import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { ChevronRight, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locationName = decodeURIComponent(slug);
  const baseUrl = getBaseUrl();

  const title = `Opinions in ${locationName}`;
  const description = `Discover what people think about ${locationName}. Read ${locationName} opinions, reviews, and community thoughts about locations, restaurants, attractions and more.`;

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

  const locationKeywords = generateLocationKeywords(locationName);

  return {
    title,
    description,
    keywords: [
      "opinions",
      "reviews",
      "location",
      "community",
      "thoughts",
      "experiences",
      locationName,
      ...locationKeywords,
    ],
    openGraph: {
      ...ogMetadata,
      url: `/location/${encodeURIComponent(locationName)}`,
    },
    twitter: twitterMetadata,
    other: {
      "og:locality": locationName,
      "geo.placename": locationName,
      "geo.region": locationName,
    },
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
  const locationName = decodeURIComponent(slug);
  const baseUrl = getBaseUrl();

  // Pins whose name contains the location (trigram index, LIKE-escaped)
  const locationPins = await searchPinsByName(locationName, 50);

  if (locationPins.length === 0) {
    notFound();
  }

  const locationSchema = generateLocationSchema(
    locationName,
    locationPins.map((p) => ({
      id: p.id,
      title: p.name,
      location: p.name,
      latitude: p.lat,
      longitude: p.lng,
    })),
    { baseUrl }
  );
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: "Home", url: "/" },
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
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link href="/" className="rounded transition-colors duration-150 hover:text-foreground">
              Home
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
                Opinions in {locationName}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {locationPins.length >= 50 ? "50+" : locationPins.length}{" "}
                {locationPins.length === 1 ? "place" : "places"} people have pinned in{" "}
                {locationName}.
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
                        <span className="truncate">by {pin.displayName}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <time dateTime={new Date(pin.createdAt).toISOString()} className="shrink-0 tabular-nums">
                      {new Date(pin.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </footer>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Been somewhere in {locationName}? Share what you think.
            </p>
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Open the map
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
