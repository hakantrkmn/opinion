"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { mapControl } from "./control-styles";

export function ThemeToggle() {
  const t = useTranslations("map.theme");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={mapControl}
      aria-label={isDark ? t("toLight") : t("toDark")}
      title={isDark ? t("lightTitle") : t("darkTitle")}
    >
      <span className="relative size-[18px]">
        <Sun
          className={cn(
            "absolute inset-0 text-amber-500 transition-[opacity,transform] duration-200 ease-out",
            isDark ? "scale-75 rotate-45 opacity-0" : "opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 text-primary transition-[opacity,transform] duration-200 ease-out",
            isDark ? "opacity-100" : "scale-75 -rotate-45 opacity-0"
          )}
        />
      </span>
    </button>
  );
}
