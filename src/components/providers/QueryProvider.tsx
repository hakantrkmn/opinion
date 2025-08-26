"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";

// Only load DevTools in development environment
const ReactQueryDevtools = 
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () => import('@tanstack/react-query-devtools').then((mod) => ({ default: mod.ReactQueryDevtools })),
        {
          ssr: false, // DevTools should only run client-side
          loading: () => null, // No loading UI needed for DevTools
        }
      )
    : () => null; // Return null component in production

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes (increased from 5)
            gcTime: 30 * 60 * 1000, // 30 minutes (increased from 10)
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false, // Prevent unnecessary refetches
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only render DevTools in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
