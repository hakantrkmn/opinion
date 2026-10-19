"use client";

import { cn } from "@/lib/utils";
import type { CommentSort } from "@/types/api";
import { COMMENT_SORTS } from "../lib/sort";

export function CommentSortTabs({
  value,
  onChange,
}: {
  value: CommentSort;
  onChange: (sort: CommentSort) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sort comments"
      className="inline-flex rounded-xl bg-muted/60 p-0.5 text-xs font-medium"
    >
      {COMMENT_SORTS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 select-none rounded-[10px] px-3 transition-colors duration-150 touch-manipulation",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
