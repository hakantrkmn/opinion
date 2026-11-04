"use client";

import { cn } from "@/lib/utils";
import type { CommentSort } from "@/types/api";
import { useTranslations } from "next-intl";
import { COMMENT_SORTS } from "../lib/sort";

export function CommentSortTabs({
  value,
  onChange,
}: {
  value: CommentSort;
  onChange: (sort: CommentSort) => void;
}) {
  const t = useTranslations("comments.sort");
  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className="inline-flex rounded-xl bg-muted/60 p-0.5 text-xs font-medium"
    >
      {COMMENT_SORTS.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-8 select-none rounded-[10px] px-3 transition-colors duration-150 touch-manipulation",
            value === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}
