import Header from "@/components/common/Header";
import { MapLoader } from "@/features/map/components/MapLoader";
import { parseLngLat } from "@/features/map/lib/view";
import { siteOpenGraph } from "@/lib/site-metadata";
import { getBaseUrl } from "@/lib/site-url";
import { createJsonLdScript, generateWebSiteSchema } from "@/lib/structured-data";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata(): Promise<Metadata> {
  const [t, openGraph] = await Promise.all([getTranslations("pages.layout"), siteOpenGraph()]);
  return {
    // Also folds the ?pin=&lat=&lng= deep links into the home page.
    alternates: { canonical: "/" },
    openGraph: { ...openGraph, title: t("title"), description: t("description"), url: "/" },
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const [params, t] = await Promise.all([searchParams, getTranslations("pages.home")]);
  const initialCenter = parseLngLat(first(params.lat), first(params.lng) ?? first(params.long));
  const pin = first(params.pin);
  const initialPinId = pin && /^[\w-]{1,64}$/.test(pin) ? pin : null;

  return (
    <div data-app-shell className="flex h-dvh flex-col overflow-clip bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdScript(generateWebSiteSchema({ baseUrl: getBaseUrl() }))}
      />
      <Header />
      <main className="relative min-h-0 flex-1">
        {/* The map is the page; this names it for screen readers and crawlers. */}
        <h1 className="sr-only">{t("h1")}</h1>
        <p className="sr-only">{t("intro")}</p>
        <MapLoader initialCenter={initialCenter} initialPinId={initialPinId} />
      </main>
    </div>
  );
}
