import { Resend } from "resend";

let cachedResend: Resend | null = null;

function getResend(): Resend {
  if (!cachedResend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    cachedResend = new Resend(apiKey);
  }
  return cachedResend;
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }
  return from;
}

export async function sendPasswordResetOtp(
  email: string,
  code: string
): Promise<void> {
  const resend = getResend();
  const from = getFromAddress();

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your droPINion password reset code",
    html: renderOtpHtml(code),
    text: renderOtpText(code),
  });

  if (error) {
    throw new Error(
      `Failed to send password reset email: ${error.message ?? "unknown error"}`
    );
  }
}

function renderOtpHtml(code: string): string {
  return `<!doctype html>
<html>
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
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">Reset your password</h2>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#525252;">
                  Use the code below to reset your password. It expires in 10 minutes.
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
                  If you didn't request this, you can safely ignore this email — your password won't change.
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

function renderOtpText(code: string): string {
  return [
    "droPINion — Reset your password",
    "",
    `Your password reset code: ${code}`,
    "",
    "This code expires in 10 minutes.",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
