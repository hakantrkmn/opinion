"use client";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { Coffee, Loader2, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SUPPORT_URL } from "./support";

interface UserMenuProps {
  name: string;
  email: string | null | undefined;
  avatarUrl: string | null | undefined;
  isAdmin: boolean;
  isSigningOut: boolean;
  onSignOut: () => void;
}

const item =
  "flex h-11 w-full select-none items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-foreground outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted active:bg-muted disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

/** Compact account menu for small screens (avatar → profile, support, sign out). */
export function UserMenu({
  name,
  email,
  avatarUrl,
  isAdmin,
  isSigningOut,
  onSignOut,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []
    );

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
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAt(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAt(list.length - 1);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => items()[0]?.focus());
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        className="flex size-11 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-[0.96]"
      >
        <span
          className={cn(
            "rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-background transition-[box-shadow] duration-150",
            open && "ring-primary/60"
          )}
        >
          <Avatar src={avatarUrl} alt={name} size="sm" fallbackText={name} />
        </span>
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Account"
        onKeyDown={onMenuKeyDown}
        className={cn(
          "absolute right-0 top-[calc(100%+6px)] z-(--z-popover) w-64 origin-top-right rounded-2xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-raised transition-[opacity,transform,visibility] duration-150 ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none invisible scale-[0.97] opacity-0"
        )}
      >
        <div className="flex items-center gap-3 px-3 pb-3 pt-2">
          <Avatar src={avatarUrl} alt="" size="md" fallbackText={name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
        </div>
        <div className="mb-1 h-px bg-border/70" role="separator" />
        <Link href="/profile" role="menuitem" className={item} onClick={() => close(false)}>
          <User />
          Profile
        </Link>
        {isAdmin ? (
          <Link href="/admin" role="menuitem" className={item} onClick={() => close(false)}>
            <Shield />
            Admin panel
          </Link>
        ) : null}
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          className={item}
          onClick={() => close(false)}
        >
          <Coffee />
          Buy me a coffee
        </a>
        <div className="my-1 h-px bg-border/70" role="separator" />
        <button
          type="button"
          role="menuitem"
          className={item}
          disabled={isSigningOut}
          onClick={() => {
            onSignOut();
          }}
        >
          {isSigningOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
