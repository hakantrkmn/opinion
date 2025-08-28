"use client";

import { lazy, Suspense } from "react";

// Lazy load analytics components
const Analytics = lazy(() =>
  import("@vercel/analytics/next").then((mod) => ({ default: mod.Analytics }))
);

const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/next").then((mod) => ({
    default: mod.SpeedInsights,
  }))
);

export function LazyAnalytics() {
  return (
    <Suspense fallback={null}>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}
