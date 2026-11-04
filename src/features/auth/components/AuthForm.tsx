"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/features/auth/hooks/useSession";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  normalizeDisplayName,
} from "@/lib/validation/user-schemas";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState } from "react";
import { AuthClientError, useAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { AuthShell, authEnter } from "@/features/auth/components/AuthShell";
import { FormError, FormField } from "@/features/auth/components/form-field";
import { PasswordInput } from "@/features/auth/components/password-input";

type Mode = "signin" | "signup";
type Field = "email" | "password" | "displayName";
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthT = ReturnType<typeof useTranslations<"auth">>;
type ErrorMessage = ReturnType<typeof useAuthErrorMessage>;

function validate(
  t: AuthT,
  mode: Mode,
  values: { email: string; password: string; displayName: string }
): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signup") {
    const name = normalizeDisplayName(values.displayName);
    if (!name) errors.displayName = t("validation.displayNameRequired");
    else if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
      errors.displayName = t("validation.displayNameLength", { min: DISPLAY_NAME_MIN, max: DISPLAY_NAME_MAX });
    }
  }
  if (!values.email.trim()) errors.email = t("validation.emailRequired");
  else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = t("validation.emailInvalid");
  }
  if (!values.password) errors.password = t("validation.passwordRequired");
  else if (mode === "signup" && values.password.length < PASSWORD_MIN) {
    errors.password = t("validation.passwordMin", { min: PASSWORD_MIN });
  } else if (values.password.length > PASSWORD_MAX) {
    errors.password = t("validation.passwordMax", { max: PASSWORD_MAX });
  }
  return errors;
}

/** Server error → which field it belongs to (if any). */
function serverFieldError(
  error: unknown,
  errorMessage: ErrorMessage
): { field?: Field; message: string } | null {
  if (!error) return null;
  const message =
    error instanceof AuthClientError
      ? errorMessage(error.info)
      : errorMessage(error instanceof Error ? { message: error.message } : null);
  const code = error instanceof AuthClientError ? error.info.code : undefined;
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || code === "INVALID_EMAIL") {
    return { field: "email", message };
  }
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") {
    return { field: "password", message };
  }
  if (code === "INVALID_DISPLAY_NAME") return { field: "displayName", message };
  return { message };
}

export default function AuthForm({
  redirectTo = "/",
  initialMode = "signin",
}: {
  redirectTo?: string;
  initialMode?: Mode;
}) {
  const {
    signIn,
    signUp,
    isSigningIn,
    isSigningUp,
    signInError,
    signUpError,
    resetErrors,
  } = useSession();
  const t = useTranslations("auth");
  const errorMessage = useAuthErrorMessage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  // Keeps the button busy between a successful auth and the navigation.
  const [redirecting, setRedirecting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isLogin = mode === "signin";
  const busy = isSigningIn || isSigningUp || redirecting;
  const server = serverFieldError(isLogin ? signInError : signUpError, errorMessage);
  const fieldError = (field: Field) =>
    errors[field] ?? (server?.field === field ? server.message : undefined);

  const update = (field: Field, value: string) => {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "displayName") setDisplayName(value);
    if (server) resetErrors();
    // After the first submit, re-validate as the user fixes things.
    if (submitted) {
      const next = validate(t, mode, { email, password, displayName, [field]: value });
      setErrors((prev) => ({ ...prev, [field]: next[field] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    resetErrors();
    setSubmitted(true);

    const next = validate(t, mode, { email, password, displayName });
    setErrors(next);
    const firstInvalid = (["displayName", "email", "password"] as const).find((f) => next[f]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`#${mode}-${firstInvalid}`)?.focus();
      return;
    }

    const onSuccess = () => setRedirecting(true);
    if (isLogin) {
      signIn({ email, password, redirectTo }, { onSuccess });
    } else {
      signUp(
        { email, password, displayName: normalizeDisplayName(displayName), redirectTo },
        { onSuccess }
      );
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setSubmitted(false);
    setPassword("");
    resetErrors();
  };

  const forgotHref =
    redirectTo && redirectTo !== "/"
      ? `/auth/forgot-password?redirect=${encodeURIComponent(redirectTo)}`
      : "/auth/forgot-password";

  const form = (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {!isLogin ? (
        <FormField
          id="signup-displayName"
          label={t("form.displayName")}
          hint={t("form.displayNameHint")}
          error={fieldError("displayName")}
        >
          <Input
            type="text"
            name="displayName"
            placeholder={t("form.displayNamePlaceholder")}
            value={displayName}
            onChange={(e) => update("displayName", e.target.value)}
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            className="h-11 rounded-xl"
          />
        </FormField>
      ) : null}

      <FormField id={`${mode}-email`} label={t("form.email")} error={fieldError("email")}>
        <Input
          type="email"
          name="email"
          placeholder={t("form.emailPlaceholder")}
          value={email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          className="h-11 rounded-xl"
        />
      </FormField>

      <FormField
        id={`${mode}-password`}
        label={t("form.password")}
        labelAside={
          isLogin ? (
            <Link
              href={forgotHref}
              className="rounded text-xs font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {t("form.forgotPassword")}
            </Link>
          ) : null
        }
        hint={isLogin ? undefined : t("form.passwordHint", { min: PASSWORD_MIN })}
        error={fieldError("password")}
      >
        <PasswordInput
          name="password"
          value={password}
          onChange={(e) => update("password", e.target.value)}
          maxLength={PASSWORD_MAX}
          autoComplete={isLogin ? "current-password" : "new-password"}
          enterKeyHint="go"
          className="h-11 rounded-xl"
        />
      </FormField>

      {server && !server.field ? <FormError>{server.message}</FormError> : null}

      <Button
        type="submit"
        disabled={busy}
        aria-busy={busy || undefined}
        className="h-11 w-full rounded-xl transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.97]"
      >
        {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {isLogin
          ? busy
            ? t("form.signingIn")
            : t("form.signIn")
          : busy
            ? t("form.creatingAccount")
            : t("form.createAccount")}
      </Button>
    </form>
  );

  return (
    <AuthShell
      title={isLogin ? t("form.signInTitle") : t("form.signUpTitle")}
      description={isLogin ? t("form.signInDescription") : t("form.signUpDescription")}
    >
      <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)} className={authEnter}>
        <TabsList className="mb-6 grid h-11 w-full grid-cols-2 rounded-xl bg-muted p-1">
          <TabsTrigger value="signin" className="h-full rounded-lg">
            {t("form.tabSignIn")}
          </TabsTrigger>
          <TabsTrigger value="signup" className="h-full rounded-lg">
            {t("form.tabSignUp")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          {isLogin ? form : null}
        </TabsContent>
        <TabsContent value="signup" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          {!isLogin ? form : null}
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-center text-xs text-muted-foreground md:text-left">
        {t.rich("form.terms", {
          link: (chunks) => (
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthShell>
  );
}
