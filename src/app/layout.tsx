import { ThemeProvider } from "@/components/common/theme-provider";
import { LazyToaster } from "@/components/LazyToaster";
import { ApiErrorTranslator } from "@/components/common/ApiErrorTranslator";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getBaseUrl } from "@/lib/site-url";
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

const OG_LOCALE = { en: "en_US", tr: "tr_TR" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("pages.layout"), getLocale()]);
  const title = t("title");
  const description = t("description");

  return {
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
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
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      url: "/",
      siteName: "droPINion",
      title,
      description,
      images: [
        {
          url: "/api/og?type=default",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t("twitterDescription"),
      creator: "@opinion_map",
      images: [
        "/api/og?type=default",
      ],
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
    verification: {
      google: "googleb77d2e6c4cda70af.html",
    },
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
