"use client";

import { Button } from "@/components/ui/button";
import { useUpdateDisplayName } from "@/features/profile/hooks/use-profile-mutations";
import { cn } from "@/lib/utils";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  normalizeDisplayName,
} from "@/lib/validation/user-schemas";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useRef, useState } from "react";

const nameClass = "text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]";

/** Own display name: heading with an edit button that turns into an inline form. */
export function DisplayNameEditor({ name }: { name: string }) {
  const update = useUpdateDisplayName();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const start = () => {
    setValue(name);
    setError(null);
    update.reset();
    setEditing(true);
  };

  const stop = () => {
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const save = () => {
    const normalized = normalizeDisplayName(value);
    if (normalized === name) return stop();
    if (normalized.length < DISPLAY_NAME_MIN || normalized.length > DISPLAY_NAME_MAX) {
      setError(`Use ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.`);
      return;
    }
    update.mutate(normalized, {
      onSuccess: stop,
      onError: (e) => setError(e.message),
    });
  };

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h1 className={cn(nameClass, "truncate")}>{name}</h1>
        <Button
          ref={editButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          onClick={start}
          aria-label="Edit display name"
          className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
      </div>
    );
  }

  const saving = update.isPending;
  return (
    <form
      className="flex min-w-0 flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h1 className="sr-only">{name}</h1>
      <label htmlFor="display-name-input" className="sr-only">
        Display name
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id="display-name-input"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              stop();
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          maxLength={DISPLAY_NAME_MAX}
          disabled={saving}
          autoComplete="nickname"
          enterKeyHint="done"
          aria-invalid={error ? true : undefined}
          aria-describedby="display-name-help"
          className={cn(
            nameClass,
            "h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 sm:text-2xl"
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={saving}
          aria-label="Save display name"
          className="size-11 shrink-0 rounded-xl"
        >
          {saving ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={saving}
          onClick={stop}
          aria-label="Cancel editing"
          className="size-11 shrink-0 rounded-xl"
        >
          <X aria-hidden />
        </Button>
      </div>
      <p
        id="display-name-help"
        className={cn("text-xs", error ? "font-medium text-destructive" : "text-muted-foreground")}
      >
        {error ?? (
          <>
            Shown on your pins and comments ·{" "}
            <span className="tabular-nums">
              {value.length}/{DISPLAY_NAME_MAX}
            </span>
          </>
        )}
      </p>
    </form>
  );
}
