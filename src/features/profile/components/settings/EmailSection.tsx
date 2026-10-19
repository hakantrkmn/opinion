"use client";

import { authErrorMessage } from "@/features/auth/lib/auth-errors";
import { FormField } from "@/features/auth/components/form-field";
import { OtpInput } from "@/features/auth/components/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/api/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, Loader2 } from "lucide-react";
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
      setError("Couldn't reach the server. Check your connection and try again.");
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
        toast.success("Code sent", { id: "email-code", description: `Check ${email}` });
      }
    );

  const verify = (code = otp) =>
    run(
      () => authClient.emailOtp.verifyEmail({ email, otp: code }),
      () => {
        reset();
        toast.success("Email verified", { id: "email-code" });
        void refresh();
      }
    );

  const requestChange = () => {
    const next = newEmail.trim();
    if (!EMAIL_RE.test(next)) {
      setError("Enter a valid email address, like you@example.com.");
      return;
    }
    if (next.toLowerCase() === email.toLowerCase()) {
      setError("That's already your email address.");
      return;
    }
    return run(
      () => authClient.emailOtp.requestEmailChange({ newEmail: next }),
      () => {
        setMode("change-confirm");
        setOtp("");
        toast.success("Code sent", { id: "email-code", description: `Check ${next}` });
      }
    );
  };

  const confirmChange = (code = otp) =>
    run(
      () => authClient.emailOtp.changeEmail({ newEmail: newEmail.trim(), otp: code }),
      () => {
        reset();
        setNewEmail("");
        toast.success("Email updated", { id: "email-code" });
        void refresh();
      }
    );

  const codeTarget = mode === "verify" ? email : newEmail.trim();

  return (
    <SettingsSection
      title="Email"
      description={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-foreground">{email}</span>
          {emailVerified ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
              <BadgeCheck aria-hidden className="size-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <CircleAlert aria-hidden className="size-3.5" />
              Not verified
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
              Verify email
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
            Change email
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
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{codeTarget}</span>
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
              {mode === "verify" ? "Verify" : "Update email"}
            </Button>
            <Button type="button" variant="ghost" className={settingsButton} onClick={reset} disabled={busy}>
              Cancel
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
            label="New email"
            hint="We'll send a code to confirm it's yours."
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
              placeholder="you@example.com"
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
              Send code
            </Button>
            <Button type="button" variant="ghost" className={settingsButton} onClick={reset} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {mode === "idle" ? <InlineError>{error}</InlineError> : null}
    </SettingsSection>
  );
}
