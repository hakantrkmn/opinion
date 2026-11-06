import { ThemeProvider } from "@/components/common/theme-provider";
import { LazyToaster } from "@/components/LazyToaster";
import { ApiErrorTranslator } from "@/components/common/ApiErrorTranslator";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getBaseUrl } from "@/lib/site-url";
import { DEFAULT_OG_IMAGE, siteOpenGraph } from "@/lib/site-metadata";
import {
  createJsonLdScript,
  generateOrganizationSchema,
} from "@/lib/structured-data";

import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const [t, openGraph] = await Promise.all([getTranslations("pages.layout"), siteOpenGraph()]);
  const title = t("title");
  const description = t("description");

  return {
    // Icons come from the file conventions: app/favicon.ico, app/icon.svg,
    // app/apple-icon.png.
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: title,
      template: "%s | droPINion",
    },
    description,
    authors: [{ name: "droPINion Team" }],
    creator: "droPINion Team",
    publisher: "droPINion",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    // No canonical / og:url here: children would inherit "/" as theirs.
    // Each indexable page sets its own.
    openGraph: { ...openGraph, title, description },
    twitter: {
      card: "summary_large_image",
      title,
      description: t("twitterDescription"),
      creator: "@opinion_map",
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Search Console is verified by public/googleb77d2e6c4cda70af.html.
    category: "Social Platform",
    classification: "Interactive Map Platform",
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "application-name": "droPINion",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = getBaseUrl();
  const organizationSchema = generateOrganizationSchema({ baseUrl });
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={createJsonLdScript(organizationSchema)}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
        <ApiErrorTranslator />
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="opinion-theme"
          >
            {children}
            <LazyToaster />
          </ThemeProvider>
        </QueryProvider>
        </NextIntlClientProvider>
      </body>
      <GoogleAnalytics gaId="G-E88MSVDNE6" />
    </html>
  );
}
