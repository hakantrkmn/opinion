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
  showHandle?: boolean;
  showCloseButton?: boolean;
}

export function ResponsiveDialogContent({
  children,
  className,
  desktopClassName,
  mobileClassName,
  showHandle = true,
  showCloseButton = true,
  ...props
}: ResponsiveDialogContentProps) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        "left-0 top-auto bottom-0 z-[80] w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-0 shadow-2xl sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:w-[min(40rem,calc(100vw-4rem))] sm:max-h-[calc(100dvh-4rem)] sm:max-w-[min(40rem,calc(100vw-4rem))] sm:-translate-x-[50%] sm:-translate-y-[50%] sm:rounded-2xl sm:border sm:border-x sm:border-b",
        mobileClassName,
        desktopClassName,
        className
      )}
      {...props}
    >
      {showHandle && (
        <div className="flex justify-center pt-3 sm:hidden">
          <div
            aria-hidden="true"
            className="h-1.5 w-12 rounded-full bg-muted-foreground/20"
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
          "px-5 pb-4 pt-2 text-left sm:px-6 sm:pb-5 sm:pt-5",
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
