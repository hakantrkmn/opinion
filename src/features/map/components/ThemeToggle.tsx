"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { mapControl } from "./control-styles";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={mapControl}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
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
