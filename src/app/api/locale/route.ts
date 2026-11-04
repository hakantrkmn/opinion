import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  getSession,
  handleRouteError,
  json,
  parseBody,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALES } from "@/i18n/config";

const bodySchema = z.object({ locale: z.enum(LOCALES) });

/**
 * POST /api/locale (JSON { locale: "en" | "tr" }) → { locale }. Sets the
 * UI language cookie for this browser and, when signed in, the account's
 * language for push and email. Works signed out too.
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const session = await getSession();
    const rl = enforceRateLimit(request, "locale", RATE_LIMITS.write, session?.user.id ?? null);
    if (rl) return rl;
    const body = await parseBody(request, bodySchema);
    if (body.error) return body.error;

    const { locale } = body.data;
    if (session) {
      await db.update(user).set({ locale, updatedAt: new Date() }).where(eq(user.id, session.user.id));
    }
    const res = json({ locale });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (error) {
    return handleRouteError(error, "POST /api/locale");
  }
}
