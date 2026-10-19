"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Label + control + hint + inline error, wired for assistive tech: the
 * control gets `id`, `aria-invalid` and `aria-describedby` (hint and error).
 * Shared by the auth pages and account settings.
 */
export function FormField({
  id,
  label,
  labelAside,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  /** Right-aligned content on the label row (e.g. "Forgot password?"). */
  labelAside?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactElement<ControlProps>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {control}
      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error (server responses that don't belong to one field). */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}
