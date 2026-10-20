import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking: never render inside a frame (legacy + CSP).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle only for the Docker image (the Dockerfile
  // sets NEXT_OUTPUT=standalone). Platforms that run `npm start` (Dokploy /
  // Nixpacks) use the regular build, which `next start` requires.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // User uploads live in UPLOAD_DIR at runtime; never trace them into the
  // build. Keep the glob specific: "./storage/**" also matches Next's own
  // dist/server/async-storage and breaks the standalone server.
  outputFileTracingExcludes: { "*": ["./storage/uploads/**"] },
  devIndicators: { position: "top-left" },
  poweredByHeader: false,
  // Images are served by our own /uploads route (already re-encoded WebP),
  // so no next/image optimizer / remote patterns are needed.
  compiler: {
    // Strip console.log/info/debug in production builds, keep errors/warnings.
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      // /uploads sets its own stricter CSP (default-src 'none'; sandbox),
      // which a global CSP header would otherwise replace.
      { source: "/((?!uploads/).*)", headers: securityHeaders },
      {
        source: "/uploads/:path*",
        headers: securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
      },
    ];
  },
};

export default nextConfig;
