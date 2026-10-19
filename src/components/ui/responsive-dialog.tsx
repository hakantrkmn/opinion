"use client";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type React from "react";
import { DialogContent } from "./dialog";

export function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & { children: React.ReactNode }) {
  return <Dialog {...props}>{children}</Dialog>;
}

interface ResponsiveDialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  desktopClassName?: string;
  mobileClassName?: string;
  overlayClassName?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  /**
   * Desktop (≥ sm) presentation. Phones always get a bottom sheet.
   * - "center": centered dialog (default)
   * - "right": floating side panel under the header, map stays visible
   */
  desktopSide?: "center" | "right";
}

/** Phones: bottom sheet that slides up. */
const MOBILE_SHEET =
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-[1.75rem] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:duration-300 max-sm:ease-drawer max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=closed]:duration-200";

const DESKTOP = {
  center:
    "sm:left-[50%] sm:top-[50%] sm:w-[min(40rem,calc(100vw-4rem))] sm:max-h-[calc(100dvh-4rem)] sm:max-w-[min(40rem,calc(100vw-4rem))] sm:-translate-x-[50%] sm:-translate-y-[50%] sm:rounded-2xl sm:border",
  right:
    "sm:left-auto sm:right-3 sm:top-[calc(var(--header-height)+0.75rem)] sm:bottom-3 sm:h-auto sm:max-h-none sm:w-[min(27rem,calc(100vw-1.5rem))] sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-[1.5rem] sm:border sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100 sm:data-[state=open]:slide-in-from-right-6 sm:data-[state=closed]:slide-out-to-right-6",
} as const;

export function ResponsiveDialogContent({
  children,
  className,
  desktopClassName,
  mobileClassName,
  overlayClassName,
  showHandle = true,
  showCloseButton = true,
  desktopSide = "center",
  ...props
}: ResponsiveDialogContentProps) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      overlayClassName={cn(
        desktopSide === "right" && "sm:bg-black/15",
        overlayClassName
      )}
      className={cn(
        "gap-0 p-0 shadow-2xl",
        MOBILE_SHEET,
        DESKTOP[desktopSide],
        mobileClassName,
        desktopClassName,
        className
      )}
      {...props}
    >
      {showHandle && (
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div
            aria-hidden="true"
            className="h-1.5 w-10 rounded-full bg-muted-foreground/25"
          />
        </div>
      )}
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogPanel({
  title,
  description,
  headerClassName,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  headerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader
        className={cn(
          "px-5 pb-4 pr-14 pt-2 text-left sm:px-6 sm:pb-5 sm:pr-14 sm:pt-5",
          headerClassName
        )}
      >
        <DialogTitle className="text-lg font-semibold tracking-tight">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
    </>
  );
}
