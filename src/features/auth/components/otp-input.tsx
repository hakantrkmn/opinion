"use client";

import { cn } from "@/lib/utils";
import { useState, type ComponentProps } from "react";

const LENGTH = 6;

/**
 * 6-digit one-time code. One real <input> (so paste, SMS/email autofill
 * via autocomplete="one-time-code" and screen readers all just work) drawn
 * as six boxes. Non-digits are stripped, so pasting "123 456" works.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  className,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Fired once when the 6th digit is entered or a full code is pasted. */
  onComplete?: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  const activeIndex = Math.min(value.length, LENGTH - 1);

  return (
    <div className={cn("relative", className)}>
      {/* Transparent input covers the boxes; typing always appends. */}
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
          onChange(next);
          if (next.length === LENGTH && value.length < LENGTH) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onSelect={(e) => {
          // Keep the caret at the end so edits always happen at the last box.
          const el = e.currentTarget;
          const len = el.value.length;
          const atEnd = el.selectionStart === len && el.selectionEnd === len;
          const selectAll = el.selectionStart === 0 && el.selectionEnd === len;
          if (!atEnd && !selectAll) {
            el.setSelectionRange(len, len);
          }
        }}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
      />
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, i) => {
          const char = value[i];
          const isActive = focused && i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border bg-background font-mono text-2xl font-semibold tabular-nums text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 dark:bg-input/30",
                invalid ? "border-destructive" : "border-input",
                isActive && !invalid && "border-ring ring-[3px] ring-ring/40",
                isActive && invalid && "ring-[3px] ring-destructive/20",
                disabled && "opacity-50"
              )}
            >
              {char ?? (
                isActive ? (
                  <span className="h-6 w-px animate-pulse bg-foreground motion-reduce:animate-none" />
                ) : null
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
