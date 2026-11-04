"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation/user-schemas";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { AuthShell, authEnter } from "@/features/auth/components/AuthShell";
import { FormError, FormField } from "@/features/auth/components/form-field";
import { OtpInput } from "@/features/auth/components/otp-input";
import { PasswordInput } from "@/features/auth/components/password-input";

type Step = "email" | "otp" | "password";

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS: Step[] = ["email", "otp", "password"];

const submitClass =
  "h-11 w-full rounded-xl transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.97]";
const linkButtonClass =
  "rounded text-sm font-medium text-muted-foreground underline-offset-4 outline-none transition-colors duration-150 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

export default function ForgotPasswordForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const authErrorMessage = useAuthErrorMessage();
  const signInHref =
    redirectTo !== "/" ? `/auth?redirect=${encodeURIComponent(redirectTo)}` : "/auth";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const errorFor = (field: string) => (fieldError?.field === field ? fieldError.message : null);
  const clearErrors = () => {
    setFieldError(null);
    setFormError(null);
  };

  const sendOtp = async (forResend = false) => {
    clearErrors();
    setSubmitting(true);
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
      if (result.error) {
        setFormError(authErrorMessage(result.error));
        return;
      }
      setCooldown(RESEND_COOLDOWN);
      if (forResend) {
        setOtp("");
        toast.success(t("forgot.newCodeSent"), {
          description: t("forgot.checkEmail", { email: email.trim() }),
        });
      } else {
        setStep("otp");
      }
    } catch {
      setFormError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim()) {
      setFieldError({ field: "email", message: t("validation.emailRequired") });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError({ field: "email", message: t("validation.emailInvalid") });
      return;
    }
    void sendOtp(false);
  };

  const handleOtpSubmit = (e?: React.FormEvent, code = otp) => {
    e?.preventDefault();
    clearErrors();
    if (!/^\d{6}$/.test(code)) {
      setFieldError({ field: "otp", message: t("validation.otpInvalid") });
      return;
    }
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    clearErrors();
    if (password.length < PASSWORD_MIN) {
      setFieldError({ field: "password", message: t("validation.passwordMin", { min: PASSWORD_MIN }) });
      return;
    }
    if (password.length > PASSWORD_MAX) {
      setFieldError({ field: "password", message: t("validation.passwordMax", { max: PASSWORD_MAX }) });
      return;
    }
    if (password !== confirmPassword) {
      setFieldError({ field: "confirm", message: t("validation.passwordMismatch") });
      return;
    }
    setSubmitting(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp,
        password,
      });
      if (result.error) {
        const message = authErrorMessage(result.error, t("forgot.resetFailed"));
        const code = result.error.code ?? "";
        if (/OTP|TOO_MANY_ATTEMPTS/.test(code) || /otp|code|expired/i.test(result.error.message ?? "")) {
          // The code is only checked here: send the user back to fix it.
          setStep("otp");
          setOtp("");
          setFieldError({ field: "otp", message });
        } else {
          setFormError(message);
        }
        return;
      }
      toast.success(t("forgot.passwordUpdated"), {
        description: t("forgot.passwordUpdatedDescription"),
      });
      router.push(signInHref);
    } catch {
      setFormError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const heading =
    step === "email"
      ? t("forgot.emailTitle")
      : step === "otp"
        ? t("forgot.otpTitle")
        : t("forgot.passwordTitle");
  const subheading =
    step === "email"
      ? t("forgot.emailDescription")
      : step === "otp"
        ? t.rich("forgot.otpDescription", {
            email: email.trim(),
            b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })
        : t("forgot.passwordDescription");

  return (
    <AuthShell title={heading} description={subheading} backHref={signInHref} backLabel={t("forgot.backToSignIn")}>
      <p className="sr-only" aria-live="polite">
        {t("forgot.step", { current: stepIndex + 1, total: STEPS.length })}
      </p>
      <div aria-hidden className="-mt-4 mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === "email" && (
        <form key="email" onSubmit={handleEmailSubmit} noValidate className={`flex flex-col gap-5 ${authEnter}`}>
          <FormField id="reset-email" label={t("forgot.email")} error={errorFor("email")}>
            <Input
              type="email"
              name="email"
              placeholder={t("forgot.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErrors();
              }}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              autoFocus
              className="h-11 rounded-xl"
            />
          </FormField>
          <FormError>{formError}</FormError>
          <Button type="submit" disabled={submitting} aria-busy={submitting || undefined} className={submitClass}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {submitting ? t("forgot.sendingCode") : t("forgot.sendCode")}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form
          key="otp"
          onSubmit={handleOtpSubmit}
          noValidate
          className={`flex flex-col gap-5 ${authEnter}`}
        >
          <FormField id="reset-otp" label={t("forgot.otpLabel")} error={errorFor("otp")}>
            <OtpInput
              name="otp"
              value={otp}
              onChange={(v) => {
                setOtp(v);
                clearErrors();
              }}
              onComplete={(code) => handleOtpSubmit(undefined, code)}
              autoFocus
            />
          </FormField>
          <FormError>{formError}</FormError>
          <Button type="submit" disabled={otp.length !== 6} className={submitClass}>
            {t("forgot.continue")}
          </Button>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                clearErrors();
              }}
              className={linkButtonClass}
            >
              {t("forgot.differentEmail")}
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || submitting}
              onClick={() => void sendOtp(true)}
              className={`${linkButtonClass} tabular-nums`}
              aria-live="polite"
            >
              {submitting
                ? t("forgot.resending")
                : cooldown > 0
                  ? t("forgot.resendIn", { seconds: cooldown })
                  : t("forgot.resend")}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form key="password" onSubmit={handlePasswordSubmit} noValidate className={`flex flex-col gap-5 ${authEnter}`}>
          {/* Lets password managers save the new password against this account. */}
          <input type="email" name="username" autoComplete="username" value={email.trim()} readOnly hidden />
          <FormField
            id="reset-password"
            label={t("forgot.newPassword")}
            hint={t("form.passwordHint", { min: PASSWORD_MIN })}
            error={errorFor("password")}
          >
            <PasswordInput
              name="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearErrors();
              }}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              enterKeyHint="next"
              autoFocus
              className="h-11 rounded-xl"
            />
          </FormField>
          <FormField id="reset-confirm" label={t("forgot.confirmPassword")} error={errorFor("confirm")}>
            <PasswordInput
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearErrors();
              }}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              enterKeyHint="done"
              className="h-11 rounded-xl"
            />
          </FormField>
          <FormError>{formError}</FormError>
          <Button type="submit" disabled={submitting} aria-busy={submitting || undefined} className={submitClass}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {submitting ? t("forgot.updatingPassword") : t("forgot.updatePassword")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
