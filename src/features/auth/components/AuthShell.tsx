import { PinIcon } from "@/components/icons/PinIcon";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** One-shot entrance used by the auth pages (reduced-motion handled globally). */
export const authEnter =
  "animate-[fadeSlideIn_200ms_cubic-bezier(0.23,1,0.32,1)_both]";

/**
 * Two-column auth layout: brand panel (md+) and the form column with a way
 * back to the map. Shared by sign in / sign up and password reset.
 */
export function AuthShell({
  title,
  description,
  backHref = "/",
  backLabel = "Back to map",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-10 text-white md:flex md:flex-col md:justify-between lg:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <Link
          href="/"
          className="relative inline-flex w-fit items-center gap-2 rounded-lg text-xl font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500">
            <PinIcon className="size-4 text-white" />
          </span>
          droPINion
        </Link>
        <div className="relative flex flex-col gap-4">
          <p className="max-w-[14ch] text-4xl font-bold leading-[1.05] tracking-tighter text-balance lg:text-5xl">
            Drop your thoughts on the map.
          </p>
          <p className="max-w-[42ch] text-sm leading-relaxed text-zinc-400">
            Pin your opinions to real places and see what people think about
            the spots around you.
          </p>
        </div>
        <p className="relative text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} droPINion ·{" "}
          <Link href="/privacy" className="underline-offset-4 hover:text-zinc-300 hover:underline">
            Privacy
          </Link>
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 lg:px-16">
        <div className="flex h-14 items-center">
          <Link
            href={backHref}
            className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {backLabel}
          </Link>
        </div>

        <div className="flex flex-1 flex-col py-6 md:justify-center md:py-8">
          <div className="mx-auto w-full max-w-sm md:mx-0">
            {/* Mobile brand */}
            <p className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight md:hidden">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <PinIcon className="size-3.5 text-white" />
              </span>
              droPINion
            </p>

            <header className={`mb-8 flex flex-col gap-1.5 ${authEnter}`}>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-pretty text-muted-foreground">{description}</p>
              ) : null}
            </header>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
