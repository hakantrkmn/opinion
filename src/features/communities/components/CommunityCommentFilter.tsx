"use client";

import { COMMUNITY_COLORS } from "@/constants/community-colors";
import { cn } from "@/lib/utils";
import type { CommunitySummary } from "@/types/api";
import { UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Everyone · <community> · …" chips above a pin's comments. Scrolls
 * sideways when the viewer is in many communities.
 */
export function CommunityCommentFilter({
  communities,
  value,
  onChange,
}: {
  communities: CommunitySummary[];
  /** Selected community id, null for everyone. */
  value: string | null;
  onChange: (communityId: string | null) => void;
}) {
  const t = useTranslations("communities.commentFilter");
  const options = [{ id: null, name: t("everyone") }, ...communities];
  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id ?? "everyone"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex h-8 max-w-48 shrink-0 select-none items-center gap-1.5 rounded-full border px-3 text-xs font-medium touch-manipulation transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] pointer-coarse:h-9",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {"color" in o ? (
              <UsersRound
                aria-hidden
                className="size-3.5 shrink-0"
                style={{ color: COMMUNITY_COLORS[o.color] }}
              />
            ) : null}
            <span className="truncate">{o.name}</span>
          </button>
        );
      })}
    </div>
  );
}
