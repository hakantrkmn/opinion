"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

/**
 * App-wide toasts. Top-center keeps them clear of the "Drop a pin" button and
 * bottom sheets on phones, and below the sticky header everywhere.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={{ top: "calc(var(--header-height) + 12px)" }}
      mobileOffset={{
        top: "calc(var(--header-height) + max(8px, env(safe-area-inset-top)))",
        left: 12,
        right: 12,
      }}
      gap={8}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-border/60 !shadow-[var(--shadow-raised)] !font-sans",
          title: "!text-sm !font-semibold",
          description: "!text-xs !text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          zIndex: "var(--z-toast)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
