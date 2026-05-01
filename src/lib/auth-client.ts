import { getBaseUrl } from "@/lib/site-url";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [emailOTPClient()],
});
