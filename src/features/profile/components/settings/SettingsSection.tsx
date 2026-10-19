import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** One block of the account settings dialog: heading, optional aside, body. */
export function SettingsSection({
  title,
  description,
  aside,
  tone = "default",
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  tone?: "default" | "destructive";
  children?: ReactNode;
  className?: string;
}) {
  const headingId = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-4 py-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3
            id={headingId}
            className={cn(
              "text-sm font-semibold",
              tone === "destructive" ? "text-destructive" : "text-foreground"
            )}
          >
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Inline result line under a settings form (errors are announced). */
export function InlineError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}

export const settingsInput = "h-11 rounded-xl";
export const settingsButton = "h-10 rounded-xl";
