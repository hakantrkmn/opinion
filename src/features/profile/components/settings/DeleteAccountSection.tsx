"use client";

import { FormField } from "@/features/auth/components/form-field";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAccount } from "@/features/profile/hooks/use-profile-mutations";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { SettingsSection, settingsButton, settingsInput } from "@/features/profile/components/settings/SettingsSection";

const CONFIRM_WORD = "DELETE";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const deleteAccount = useDeleteAccount();

  const close = () => {
    setOpen(false);
    setPassword("");
    setConfirmText("");
    deleteAccount.reset();
  };

  const description =
    "Permanently removes your account, comments, votes, photos and follows, and signs you out everywhere.";

  if (!open) {
    return (
      <SettingsSection
        title="Delete account"
        tone="destructive"
        description={description}
        aside={
          <Button
            variant="outline"
            className={`${settingsButton} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}
            onClick={() => setOpen(true)}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
        }
      />
    );
  }

  const pending = deleteAccount.isPending;
  const confirmed = confirmText.trim() === CONFIRM_WORD;
  const canSubmit = password.length > 0 && confirmed && !pending;
  const serverError = deleteAccount.error?.message;
  const wrongPassword = !!serverError && /password/i.test(serverError);

  return (
    <SettingsSection title="Delete account" tone="destructive">
      <form
        className="flex flex-col gap-4 rounded-2xl border border-destructive/40 bg-destructive/[0.04] p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) deleteAccount.mutate(password);
        }}
      >
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-semibold text-foreground">This can&apos;t be undone.</p>
          <p className="text-pretty text-muted-foreground">
            {description} Pins other people commented on stay on the map, shown as by a deleted
            user.
          </p>
        </div>
        <FormField
          id="delete-password"
          label="Current password"
          error={wrongPassword ? serverError : null}
        >
          <PasswordInput
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (deleteAccount.error) deleteAccount.reset();
            }}
            disabled={pending}
            className={settingsInput}
          />
        </FormField>
        <FormField
          id="delete-confirm"
          label={
            <>
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </>
          }
        >
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={pending}
            className={`${settingsInput} font-mono`}
          />
        </FormField>
        {serverError && !wrongPassword ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {serverError}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" className={settingsButton} onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" className={settingsButton} disabled={!canSubmit}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Trash2 aria-hidden />}
            {pending ? "Deleting account…" : "Delete my account"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
