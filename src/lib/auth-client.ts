import { getBaseUrl } from "@/lib/site-url";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
});
