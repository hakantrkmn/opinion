"use client";

import { cn } from "@/lib/utils";
import type { PinScope } from "@/types/api";
import { Globe2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { mapSurface } from "./control-styles";

interface ScopeToggleProps {
  scope: PinScope;
  onChange: (scope: PinScope) => void;
  /** Called instead of switching to "following" when logged out. */
  onRequireSignIn: () => void;
  signedIn: boolean;
}

const OPTIONS = [
  { value: "all", icon: Globe2 },
  { value: "following", icon: Users },
] as const;

export function ScopeToggle({ scope, onChange, onRequireSignIn, signedIn }: ScopeToggleProps) {
  const t = useTranslations("map.scope");
  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn("pointer-events-auto flex rounded-xl p-0.5", mapSurface)}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = scope === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (value === "following" && !signedIn) onRequireSignIn();
              else onChange(value);
            }}
            className={cn(
              "flex h-9 select-none items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium touch-manipulation transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] pointer-coarse:h-10",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
