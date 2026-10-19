"use client";

import { authErrorMessage } from "@/features/auth/lib/auth-errors";
import { FormField } from "@/features/auth/components/form-field";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/api/query-keys";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation/user-schemas";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InlineError, SettingsSection, settingsButton, settingsInput } from "@/features/profile/components/settings/SettingsSection";

type FieldKey = "current" | "next" | "confirm";

export function PasswordSection({ email }: { email: string }) {
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
    if (!current) return setFieldError({ field: "current", message: "Enter your current password." });
    if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
      return setFieldError({ field: "next", message: `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters.` });
    }
    if (next === current) {
      return setFieldError({ field: "next", message: "Choose a password different from the current one." });
    }
    if (next !== confirm) return setFieldError({ field: "confirm", message: "Passwords don't match." });

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
      toast.success("Password changed", {
        description: revokeOthers ? "Other devices were signed out." : undefined,
      });
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <SettingsSection
        title="Password"
        description="Use a long password you don't use anywhere else."
        aside={
          <Button variant="outline" className={settingsButton} onClick={() => setOpen(true)}>
            <KeyRound aria-hidden />
            Change
          </Button>
        }
      />
    );
  }

  return (
    <SettingsSection title="Password" description="Use a long password you don't use anywhere else.">
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {/* Lets password managers update the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <FormField id="current-password" label="Current password" error={errorFor("current")}>
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
          label="New password"
          hint={`At least ${PASSWORD_MIN} characters.`}
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
        <FormField id="confirm-password" label="Confirm new password" error={errorFor("confirm")}>
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
          Sign out of all other devices
        </label>
        <InlineError>{formError}</InlineError>
        <div className="flex gap-2">
          <Button type="submit" className={settingsButton} disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? "Updating…" : "Update password"}
          </Button>
          <Button type="button" variant="ghost" className={settingsButton} onClick={close} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
