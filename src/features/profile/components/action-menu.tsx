"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Small accessible overflow menu (menu button pattern): arrow keys,
 * Home/End, Escape returns focus to the trigger, click-outside closes.
 *
 * TODO: swap for a shared shadcn DropdownMenu once one lands in
 * components/ui (no dropdown primitive is installed yet).
 */
export function ActionMenu({
  items,
  trigger,
  label,
  align = "end",
  triggerClassName,
}: {
  items: ActionMenuItem[];
  trigger: ReactNode;
  /** Accessible name of the trigger. */
  label: string;
  align?: "start" | "end";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const focusItem = useCallback(
    (index: number) => {
      const enabled = items
        .map((item, i) => (item.disabled ? -1 : i))
        .filter((i) => i >= 0);
      if (enabled.length === 0) return;
      const target = enabled[(index + enabled.length) % enabled.length];
      itemRefs.current[target]?.focus();
    },
    [items]
  );

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const openMenu = (focusIndex = 0) => {
    setOpen(true);
    requestAnimationFrame(() => focusItem(focusIndex));
  };

  const currentIndex = () =>
    itemRefs.current.findIndex((el) => el === document.activeElement);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu(e.key === "ArrowUp" ? -1 : 0);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            const i = currentIndex();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusItem(i + 1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              focusItem(i - 1);
            } else if (e.key === "Home") {
              e.preventDefault();
              focusItem(0);
            } else if (e.key === "End") {
              e.preventDefault();
              focusItem(-1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "Tab") {
              close(false);
            }
          }}
          className={cn(
            "absolute top-full z-(--z-popover) mt-1.5 min-w-48 rounded-xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150 ease-out",
            align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cn(
                  "flex min-h-10 w-full select-none items-center gap-2.5 rounded-lg px-3 text-left text-sm outline-none transition-colors duration-100",
                  "hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50",
                  item.destructive && "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
                )}
              >
                {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
