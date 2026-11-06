"use client";

import { COMMUNITY_COLORS } from "@/constants/community-colors";
import { cn } from "@/lib/utils";
import type { CommunitySummary } from "@/types/api";
import { Check, ChevronDown, Globe2, Plus, Users, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { MapFilter } from "../hooks/useMapScope";
import { mapSurface } from "./control-styles";

interface ScopeToggleProps {
  filter: MapFilter;
  onChange: (filter: MapFilter) => void;
  /** Called instead of switching away from "all" when logged out. */
  onRequireSignIn: () => void;
  signedIn: boolean;
  /** The viewer's communities (undefined while loading). */
  communities: CommunitySummary[] | undefined;
}

const OPTIONS = [
  { value: "all", icon: Globe2 },
  { value: "following", icon: Users },
] as const;

const segment =
  "flex h-9 select-none items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium touch-manipulation transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] pointer-coarse:h-10";
const segmentActive = "bg-primary text-primary-foreground shadow-sm";
const segmentIdle = "text-muted-foreground hover:text-foreground";
// Phones only have room for one label: the active segment's.

export function ScopeToggle({
  filter,
  onChange,
  onRequireSignIn,
  signedIn,
  communities,
}: ScopeToggleProps) {
  const t = useTranslations("map.scope");
  const selected =
    filter.scope === "community"
      ? communities?.find((c) => c.id === filter.communityId)
      : undefined;
  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      // z-10: the blur makes this a stacking context; keep the community
      // menu above the map controls on the right.
      className={cn("pointer-events-auto relative z-10 flex min-w-0 rounded-xl p-0.5", mapSurface)}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = filter.scope === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (value === "following" && !signedIn) onRequireSignIn();
              else onChange({ scope: value, communityId: null });
            }}
            className={cn(segment, active ? segmentActive : segmentIdle)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className={cn("whitespace-nowrap", !active && "max-sm:sr-only")}>{t(value)}</span>
          </button>
        );
      })}
      <CommunityPicker
        active={filter.scope === "community"}
        selectedId={filter.communityId}
        label={selected?.name ?? t("community")}
        communities={communities}
        signedIn={signedIn}
        onRequireSignIn={onRequireSignIn}
        onPick={(id) => onChange({ scope: "community", communityId: id })}
      />
    </div>
  );
}

const menuItem =
  "flex min-h-11 w-full select-none items-center gap-3 rounded-xl px-3 py-2 text-left text-sm outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted active:bg-muted";

/**
 * Third segment: a menu button (not a radio) listing the viewer's
 * communities; the chosen one is the checked menuitemradio.
 */
function CommunityPicker({
  active,
  selectedId,
  label,
  communities,
  signedIn,
  onRequireSignIn,
  onPick,
}: {
  active: boolean;
  selectedId: string | null;
  label: string;
  communities: CommunitySummary[] | undefined;
  signedIn: boolean;
  onRequireSignIn: () => void;
  onPick: (id: string) => void;
}) {
  const t = useTranslations("map.scope");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // Focus the current choice (or the first item) when the menu opens.
    requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]');
      const current = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      (current ?? items?.[0])?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []
    );
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAt(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (signedIn ? setOpen((v) => !v) : onRequireSignIn())}
        className={cn(segment, "min-w-0 pr-2", active ? segmentActive : segmentIdle)}
      >
        <UsersRound className="h-3.5 w-3.5 shrink-0" />
        <span className={cn("max-w-28 truncate", !active && "max-sm:sr-only")}>{label}</span>
        <ChevronDown
          aria-hidden
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={t("communitiesMenu")}
        onKeyDown={onMenuKeyDown}
        className={cn(
          "absolute left-0 top-[calc(100%+8px)] z-(--z-popover) w-64 max-w-[calc(100vw-1.5rem)] origin-top-left rounded-2xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-raised transition-[opacity,transform,visibility] duration-150 ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none invisible scale-[0.97] opacity-0"
        )}
      >
        {communities && communities.length > 0 ? (
          <>
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
              {t("communitiesHeading")}
            </p>
            {communities.map((c) => {
              const checked = active && c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  tabIndex={-1}
                  className={menuItem}
                  onClick={() => {
                    onPick(c.id);
                    close(true);
                  }}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COMMUNITY_COLORS[c.color] }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("members", { count: c.members_count })}
                    </span>
                  </span>
                  {checked ? <Check aria-hidden className="size-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
            <div className="my-1 h-px bg-border/70" role="separator" />
          </>
        ) : communities ? (
          <p className="px-3 pb-2 pt-2.5 text-xs leading-relaxed text-muted-foreground">
            {t("noCommunities")}
          </p>
        ) : (
          <p className="px-3 py-2.5 text-xs text-muted-foreground">{t("loadingCommunities")}</p>
        )}
        <Link
          href="/communities"
          role="menuitem"
          tabIndex={-1}
          className={cn(menuItem, "font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground")}
          onClick={() => close(false)}
        >
          {communities && communities.length > 0 ? <UsersRound /> : <Plus />}
          {communities && communities.length > 0 ? t("manageCommunities") : t("createCommunity")}
        </Link>
      </div>
    </div>
  );
}
