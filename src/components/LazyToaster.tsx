"use client";

import { lazy, Suspense } from "react";

// Lazy load Toaster component
const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((mod) => ({ default: mod.Toaster }))
);

export function LazyToaster() {
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}
