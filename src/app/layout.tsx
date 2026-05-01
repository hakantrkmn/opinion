import { ThemeProvider } from "@/components/common/theme-provider";
import { LazyToaster } from "@/components/LazyToaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getBaseUrl } from "@/lib/site-url";
import {
  createJsonLdScript,
  generateOrganizationSchema,
} from "@/lib/structured-data";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: "yes",
    viewportFit: "cover",
    height: "device-height",
  };
}

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "droPINion — Discover & Share Place Reviews on the Map",
    template: "%s | droPINion",
  },
  description:
    "Drop a pin, share your honest opinion on any location, and discover what locals think. Reviews, ratings, and stories from a global community.",
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
    locale: "en_US",
    url: "/",
    siteName: "droPINion",
    title: "droPINion — Discover & Share Place Reviews on the Map",
    description:
      "Drop a pin, share your honest opinion on any location, and discover what locals think. Reviews, ratings, and stories from a global community.",
    images: [
      {
        url: "/api/og?title=droPINion&description=Discover%20%26%20Share%20Place%20Reviews&type=default",
        width: 1200,
        height: 630,
        alt: "droPINion - Interactive Opinion Map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "droPINion — Discover & Share Place Reviews on the Map",
    description:
      "Drop a pin, share your honest opinion on any location, and discover what locals think.",
    creator: "@opinion_map",
    images: [
      "/api/og?title=droPINion&description=Discover%20%26%20Share%20Place%20Reviews&type=default",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = getBaseUrl();
  const organizationSchema = generateOrganizationSchema({ baseUrl });

  return (
    <html lang="en" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
