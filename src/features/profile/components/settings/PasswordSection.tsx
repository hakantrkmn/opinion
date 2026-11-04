"use client";

import { useAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { FormField } from "@/features/auth/components/form-field";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/api/query-keys";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation/user-schemas";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { InlineError, SettingsSection, settingsButton, settingsInput } from "@/features/profile/components/settings/SettingsSection";

type FieldKey = "current" | "next" | "confirm";

export function PasswordSection({ email }: { email: string }) {
  const t = useTranslations("profile.password");
  const tSettings = useTranslations("profile.settings");
  const authErrorMessage = useAuthErrorMessage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: FieldKey; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errorFor = (field: FieldKey) => (fieldError?.field === field ? fieldError.message : null);
  const clear = () => {
    setFieldError(null);
    setFormError(null);
  };

  const close = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    clear();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    clear();
    if (!current) return setFieldError({ field: "current", message: t("enterCurrent") });
    if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
      return setFieldError({ field: "next", message: t("length", { min: PASSWORD_MIN, max: PASSWORD_MAX }) });
    }
    if (next === current) {
      return setFieldError({ field: "next", message: t("different") });
    }
    if (next !== confirm) return setFieldError({ field: "confirm", message: t("mismatch") });

    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: revokeOthers,
      });
      if (result.error) {
        const message = authErrorMessage(result.error);
        if (result.error.code === "INVALID_PASSWORD") setFieldError({ field: "current", message });
        else setFormError(message);
        return;
      }
      close();
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
      toast.success(t("changed"), {
        description: revokeOthers ? t("othersSignedOut") : undefined,
      });
    } catch {
      setFormError(tSettings("networkError"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <SettingsSection
        title={t("title")}
        description={t("description")}
        aside={
          <Button variant="outline" className={settingsButton} onClick={() => setOpen(true)}>
            <KeyRound aria-hidden />
            {t("change")}
          </Button>
        }
      />
    );
  }

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {/* Lets password managers update the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <FormField id="current-password" label={t("current")} error={errorFor("current")}>
          <PasswordInput
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              clear();
            }}
            className={settingsInput}
          />
        </FormField>
        <FormField
          id="new-password"
          label={t("new")}
          hint={t("newHint", { min: PASSWORD_MIN })}
          error={errorFor("next")}
        >
          <PasswordInput
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              clear();
            }}
            className={settingsInput}
          />
        </FormField>
        <FormField id="confirm-password" label={t("confirm")} error={errorFor("confirm")}>
          <PasswordInput
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clear();
            }}
            className={settingsInput}
          />
        </FormField>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={revokeOthers}
            onChange={(e) => setRevokeOthers(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          {t("signOutOthers")}
        </label>
        <InlineError>{formError}</InlineError>
        <div className="flex gap-2">
          <Button type="submit" className={settingsButton} disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? t("updating") : t("update")}
          </Button>
          <Button type="button" variant="ghost" className={settingsButton} onClick={close} disabled={busy}>
            {tSettings("cancel")}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
