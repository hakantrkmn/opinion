import "server-only";
import { Resend } from "resend";
import { db, sql } from "@/server/db";
import type { Locale } from "@/i18n/config";
import { recipientLocale } from "@/server/i18n/push-copy";

export type OtpEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

let cachedResend: Resend | null = null;

/** True when Resend credentials are present. */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

function getResend(): Resend {
  if (!cachedResend) cachedResend = new Resend(process.env.RESEND_API_KEY);
  return cachedResend;
}

type OtpCopy = { subject: string; heading: string; intro: string };

/** Shared lines of every code email. */
const COMMON_COPY: Record<Locale, { code: string; expires: string; ignore: string }> = {
  en: {
    code: "Your code",
    expires: "This code expires in 10 minutes.",
    ignore: "If you didn't request this, you can safely ignore this email.",
  },
  tr: {
    code: "Kodun",
    expires: "Bu kodun süresi 10 dakika içinde doluyor.",
    ignore: "Bunu sen istemediysen bu e-postayı görmezden gelebilirsin.",
  },
};

const OTP_COPY: Record<Locale, Record<OtpEmailType, OtpCopy>> = {
  en: {
    "forget-password": {
      subject: "Your droPINion password reset code",
      heading: "Reset your password",
      intro: "Use the code below to reset your password. It expires in 10 minutes.",
    },
    "email-verification": {
      subject: "Verify your droPINion email",
      heading: "Verify your email",
      intro: "Use the code below to verify your email address. It expires in 10 minutes.",
    },
    "change-email": {
      subject: "Confirm your new droPINion email",
      heading: "Confirm your new email",
      intro: "Use the code below to confirm this as your new email address. It expires in 10 minutes.",
    },
    "sign-in": {
      subject: "Your droPINion sign-in code",
      heading: "Sign in to droPINion",
      intro: "Use the code below to sign in. It expires in 10 minutes.",
    },
  },
  tr: {
    "forget-password": {
      subject: "droPINion şifre sıfırlama kodun",
      heading: "Şifreni sıfırla",
      intro: "Şifreni sıfırlamak için aşağıdaki kodu kullan. Kodun süresi 10 dakika.",
    },
    "email-verification": {
      subject: "droPINion e-postanı doğrula",
      heading: "E-postanı doğrula",
      intro: "E-posta adresini doğrulamak için aşağıdaki kodu kullan. Kodun süresi 10 dakika.",
    },
    "change-email": {
      subject: "Yeni droPINion e-postanı onayla",
      heading: "Yeni e-postanı onayla",
      intro: "Bu adresi yeni e-postan olarak onaylamak için aşağıdaki kodu kullan. Kodun süresi 10 dakika.",
    },
    "sign-in": {
      subject: "droPINion giriş kodun",
      heading: "droPINion'a giriş yap",
      intro: "Giriş yapmak için aşağıdaki kodu kullan. Kodun süresi 10 dakika.",
    },
  },
};

/**
 * The account's language for this address, else the requester's, else
 * Turkish.
 */
async function localeForEmail(email: string, requestLocale?: Locale | null): Promise<Locale> {
  try {
    const [row] = (await db.execute(sql`
      SELECT locale FROM "user" WHERE lower(email) = lower(${email}) LIMIT 1
    `)) as unknown as Array<{ locale: string | null }>;
    return recipientLocale(row?.locale ?? requestLocale);
  } catch {
    return recipientLocale(requestLocale);
  }
}

/**
 * Send a one-time code. When Resend is not configured the code is logged to
 * the server console in development (so flows can be tested locally) and an
 * error without the code is logged in production. Never throws.
 */
export async function sendOtpEmail(
  email: string,
  code: string,
  type: OtpEmailType,
  /** The requester's language (session or browser), see auth.ts. */
  requestLocale?: Locale | null
): Promise<void> {
  // A change-email code goes to an address no account has yet: use the
  // requester's language. Otherwise the account's choice wins.
  const locale =
    type === "change-email" && requestLocale
      ? requestLocale
      : await localeForEmail(email, requestLocale);
  const copy = OTP_COPY[locale][type];
  const common = COMMON_COPY[locale];
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email:dev] ${type} code for ${email}: ${code}`);
    } else {
      console.error(
        `[email] RESEND_API_KEY/RESEND_FROM_EMAIL not set; could not send ${type} code`
      );
    }
    return;
  }

  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: email,
      subject: copy.subject,
      html: renderOtpHtml(code, copy.heading, copy.intro, common.ignore, locale),
      text: renderOtpText(code, copy.heading, common),
    });
    if (error) console.error(`[email] Resend error (${type}):`, error.message);
  } catch (error) {
    console.error(`[email] Failed to send ${type} code:`, error);
  }
}

/** @deprecated use sendOtpEmail(email, code, "forget-password") */
export async function sendPasswordResetOtp(email: string, code: string) {
  await sendOtpEmail(email, code, "forget-password");
}

function renderOtpHtml(
  code: string,
  heading: string,
  intro: string,
  ignore: string,
  locale: Locale
): string {
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:32px 32px 0;">
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">droPINion</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;">
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">${escapeHtml(heading)}</h2>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#525252;">
                  ${escapeHtml(intro)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:10px;padding:20px;text-align:center;">
                  <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.4em;color:#0a0a0a;">
                    ${escapeHtml(code)}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#737373;">
                  ${escapeHtml(ignore)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
                <p style="margin:0;font-size:11px;color:#a3a3a3;">&copy; ${new Date().getFullYear()} droPINion</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderOtpText(
  code: string,
  heading: string,
  common: (typeof COMMON_COPY)[Locale]
): string {
  return [`droPINion — ${heading}`, "", `${common.code}: ${code}`, "", common.expires, common.ignore].join(
    "\n"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
