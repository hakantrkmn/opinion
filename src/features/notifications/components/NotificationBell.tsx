"use client";

import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useUnreadNotificationCount } from "../hooks/use-notifications";

const NotificationInbox = dynamic(
  () => import("./NotificationInbox").then((m) => m.NotificationInbox),
  { ssr: false }
);

/** Header bell with an unread badge; opens the inbox. Signed-in only. */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  // Loaded once opened, then kept mounted so the close animation plays.
  const [mounted, setMounted] = useState(false);
  const { data: unread = 0 } = useUnreadNotificationCount(true);
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className={cn("relative", className)}
        aria-label={label}
        title="Notifications"
      >
        <Bell />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background animate-in zoom-in-50 duration-200 pointer-coarse:right-1.5 pointer-coarse:top-1.5"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {mounted ? <NotificationInbox open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
