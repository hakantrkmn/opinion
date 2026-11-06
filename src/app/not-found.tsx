import Header from "@/components/common/Header";
import { PinIcon } from "@/components/icons/PinIcon";
import { Compass, Map as MapIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("pages.notFound");
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
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]"
          >
            <MapIcon className="size-4" aria-hidden />
            {t("backToMap")}
          </Link>
          <Link
            href="/explore"
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-medium text-muted-foreground transition-[transform,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <Compass className="size-4" aria-hidden />
            {t("explore")}
          </Link>
        </div>
      </main>
    </div>
  );
}
