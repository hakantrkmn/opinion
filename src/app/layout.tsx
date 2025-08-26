import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "oPINion - Share Your Thoughts on the Map",
    template: "%s | oPINion",
  },
  description: "Interactive map platform where you can share opinions and discover what others think about different locations around the world.",
  keywords: ["opinion", "map", "location", "thoughts", "community", "interactive", "share", "feedback"],
  authors: [{ name: "oPINion Team" }],
  creator: "oPINion Team",
  publisher: "oPINion",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://opinion-map.vercel.app'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "oPINion",
    title: "oPINion - Share Your Thoughts on the Map",
    description: "Interactive map platform where you can share opinions and discover what others think about different locations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "oPINion - Share Your Thoughts on the Map",
    description: "Interactive map platform where you can share opinions and discover what others think about different locations.",
    creator: "@opinion_map",
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
    google: "your-google-verification-code", // Google Search Console'dan alacaksınız
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <Analytics />
              <SpeedInsights />
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
