import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from all domains for maximum flexibility
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "juuestllrnczytxmaxzm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Generic Supabase storage pattern for any project
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Buy Me a Coffee CDN
      {
        protocol: "https",
        hostname: "cdn.buymeacoffee.com",
        port: "",
        pathname: "/**",
      },
      // Vercel CDN and deployment URLs
      {
        protocol: "https",
        hostname: "*.vercel.app",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vercel.com",
        port: "",
        pathname: "/**",
      },
      // Common CDN providers
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cdnbuymeacoffee.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.imgur.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.gravatar.com",
        port: "",
        pathname: "/**",
      },
      // Allow all HTTPS domains as fallback (be careful with this)
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**",
      },
      // Allow all HTTP domains as fallback (only for development)
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-primitive",
      "@radix-ui/react-portal",
      "@radix-ui/react-presence",
      "@radix-ui/react-dismissable-layer",
      "@radix-ui/react-focus-scope",
      "@radix-ui/react-compose-refs",
      "lucide-react",
      "class-variance-authority",
      "clsx",
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            reuseExistingChunk: true,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: "radix",
            priority: 20,
            reuseExistingChunk: true,
          },
          maplibre: {
            test: /[\\/]node_modules[\\/](maplibre-gl|mapbox-gl)[\\/]/,
            name: "maplibre",
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
