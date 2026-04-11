import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      // Project serves user-uploaded photos from Supabase storage and external
      // avatars (Google, etc). Migrating to next/image would require
      // remotePatterns config plus per-call width/height props; keep <img> for now.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
