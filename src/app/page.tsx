import ClientMapWrapper from "@/components/ClientMapWrapper";
import Header from "@/components/Header";
import { Metadata } from "next";

// SEO için metadata
export const metadata: Metadata = {
  title: "oPINion - Share Your Thoughts on the Map",
  description: "Interactive map platform where you can share opinions and discover what others think about different locations around the world.",
  keywords: ["opinion", "map", "location", "thoughts", "community", "interactive", "share"],
  authors: [{ name: "oPINion Team" }],
  openGraph: {
    title: "oPINion - Share Your Thoughts on the Map",
    description: "Interactive map platform where you can share opinions and discover what others think about different locations.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "oPINion - Share Your Thoughts on the Map",
    description: "Interactive map platform where you can share opinions and discover what others think about different locations.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Server component - SEO için mükemmel
export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        <ClientMapWrapper />
      </main>
    </div>
  );
}
