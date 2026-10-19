import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { Map as MapIcon } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <div className="relative mb-6">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <PinIcon className="size-8 text-muted-foreground/70" />
            </span>
            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-foreground px-1.5 text-[11px] font-bold tabular-nums text-background">
              404
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Nothing pinned here</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This page doesn&apos;t exist, or the pin was removed by its author.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]"
          >
            <MapIcon className="size-4" aria-hidden />
            Back to the map
          </Link>
        </div>
      </main>
    </div>
  );
}
