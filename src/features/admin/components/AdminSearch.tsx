"use client";

import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface AdminSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}

export function AdminSearch({ value, onChange, placeholder, label }: AdminSearchProps) {
  return (
    <div role="search" className="relative sm:max-w-sm">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder ? `${placeholder}…` : "Search…"}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-10 rounded-xl pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Clear search"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
