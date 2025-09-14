import { ThemeProvider } from "@/components/common/theme-provider";
import { LazyAnalytics } from "@/components/LazyAnalytics";
import { LazyToaster } from "@/components/LazyToaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
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
    maximumScale: 1,
    userScalable: "no",
    viewportFit: "cover",
    height: "device-height",
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app"
  ),
  title: {
    default: "oPINion - Share Your Thoughts on the Map",
    template: "%s | oPINion",
  },
  description:
    "Interactive map platform where you can share opinions and discover what others think about different locations around the world. Join our community to explore local insights, reviews, and experiences.",
  keywords: [
    "opinion",
    "map",
    "location",
    "thoughts",
    "community",
    "interactive",
    "share",
    "feedback",
    "reviews",
    "local insights",
    "travel",
    "places",
    "experiences",
    "social map",
    "location reviews",
  ],
  authors: [{ name: "oPINion Team" }],
  creator: "oPINion Team",
  publisher: "oPINion",
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
    siteName: "oPINion",
    title: "oPINion - Share Your Thoughts on the Map",
    description:
      "Interactive map platform where you can share opinions and discover what others think about different locations. Join our global community of explorers.",
    images: [
      {
        url: "/api/og?title=oPINion&description=Share Your Thoughts on the Map&type=default",
        width: 1200,
        height: 630,
        alt: "oPINion - Interactive Opinion Map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "oPINion - Share Your Thoughts on the Map",
    description:
      "Interactive map platform where you can share opinions and discover what others think about different locations.",
    creator: "@opinion_map",
    images: [
      "/api/og?title=oPINion&description=Share Your Thoughts on the Map&type=default",
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
    "application-name": "oPINion",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://opinion-xi.vercel.app";
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
            <LazyAnalytics />
            {children}
            <LazyToaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
