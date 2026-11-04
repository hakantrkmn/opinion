"use client";

import { useAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { FormField } from "@/features/auth/components/form-field";
import { OtpInput } from "@/features/auth/components/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/api/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { InlineError, SettingsSection, settingsButton, settingsInput } from "@/features/profile/components/settings/SettingsSection";

type Mode = "idle" | "verify" | "change-request" | "change-confirm";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSection({
  email,
  emailVerified,
}: {
  email: string;
  emailVerified: boolean;
}) {
  const t = useTranslations("profile.email");
  const tSettings = useTranslations("profile.settings");
  const authErrorMessage = useAuthErrorMessage();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("idle");
  const [otp, setOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });

  const run = async (fn: () => Promise<{ error: unknown }>, onOk: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result.error) {
        setError(authErrorMessage(result.error as { code?: string; message?: string; status?: number }));
        return;
      }
      onOk();
    } catch {
      setError(tSettings("networkError"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMode("idle");
    setOtp("");
    setError(null);
  };

  const sendVerification = () =>
    run(
      () => authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }),
      () => {
        setMode("verify");
        setOtp("");
        toast.success(t("codeSent"), { id: "email-code", description: t("check", { email }) });
      }
    );

  const verify = (code = otp) =>
    run(
      () => authClient.emailOtp.verifyEmail({ email, otp: code }),
      () => {
        reset();
        toast.success(t("verifiedToast"), { id: "email-code" });
        void refresh();
      }
    );

  const requestChange = () => {
    const next = newEmail.trim();
    if (!EMAIL_RE.test(next)) {
      setError(t("invalid"));
      return;
    }
    if (next.toLowerCase() === email.toLowerCase()) {
      setError(t("same"));
      return;
    }
    return run(
      () => authClient.emailOtp.requestEmailChange({ newEmail: next }),
      () => {
        setMode("change-confirm");
        setOtp("");
        toast.success(t("codeSent"), { id: "email-code", description: t("check", { email: next }) });
      }
    );
  };

  const confirmChange = (code = otp) =>
    run(
      () => authClient.emailOtp.changeEmail({ newEmail: newEmail.trim(), otp: code }),
      () => {
        reset();
        setNewEmail("");
        toast.success(t("updatedToast"), { id: "email-code" });
        void refresh();
      }
    );

  const codeTarget = mode === "verify" ? email : newEmail.trim();

  return (
    <SettingsSection
      title={t("title")}
      description={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-foreground">{email}</span>
          {emailVerified ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
              <BadgeCheck aria-hidden className="size-3.5" />
              {t("verified")}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <CircleAlert aria-hidden className="size-3.5" />
              {t("notVerified")}
            </span>
          )}
        </span>
      }
    >
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {!emailVerified && (
            <Button className={settingsButton} onClick={() => void sendVerification()} disabled={busy}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {t("verifyEmail")}
            </Button>
          )}
          <Button
            variant="outline"
            className={settingsButton}
            onClick={() => {
              setMode("change-request");
              setError(null);
            }}
          >
            {t("changeEmail")}
          </Button>
        </div>
      )}

      {(mode === "verify" || mode === "change-confirm") && (
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void (mode === "verify" ? verify() : confirmChange());
          }}
        >
          <FormField
            id="email-otp"
            label={
              <span className="font-normal text-muted-foreground">
                {t.rich("codeSentTo", {
                  target: codeTarget,
                  b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </span>
            }
            error={error}
          >
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setError(null);
              }}
              onComplete={(code) => void (mode === "verify" ? verify(code) : confirmChange(code))}
              disabled={busy}
              autoFocus
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" className={settingsButton} disabled={busy || otp.length !== 6}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {mode === "verify" ? t("verify") : t("updateEmail")}
            </Button>
            <Button type="button" variant="ghost" className={settingsButton} onClick={reset} disabled={busy}>
              {tSettings("cancel")}
            </Button>
          </div>
        </form>
      )}

      {mode === "change-request" && (
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void requestChange();
          }}
        >
          <FormField
            id="new-email"
            label={t("newEmail")}
            hint={t("newEmailHint")}
            error={error}
          >
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              autoFocus
              placeholder={t("newEmailPlaceholder")}
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setError(null);
              }}
              className={settingsInput}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" className={settingsButton} disabled={busy || !newEmail.trim()}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {t("sendCode")}
            </Button>
            <Button type="button" variant="ghost" className={settingsButton} onClick={reset} disabled={busy}>
              {tSettings("cancel")}
            </Button>
          </div>
        </form>
      )}

      {mode === "idle" ? <InlineError>{error}</InlineError> : null}
    </SettingsSection>
  );
}
