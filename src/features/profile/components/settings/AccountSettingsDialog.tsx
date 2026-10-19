"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import type { OwnUserProfile } from "@/types/userTypes";
import { ChevronRight, ShieldOff } from "lucide-react";
import { DeleteAccountSection } from "@/features/profile/components/settings/DeleteAccountSection";
import { EmailSection } from "@/features/profile/components/settings/EmailSection";
import { PasswordSection } from "@/features/profile/components/settings/PasswordSection";
import { SessionsSection } from "@/features/profile/components/settings/SessionsSection";
import { SettingsSection } from "@/features/profile/components/settings/SettingsSection";

export function AccountSettingsDialog({
  profile,
  open,
  onOpenChange,
  onOpenBlocked,
}: {
  profile: OwnUserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenBlocked?: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[92dvh] overflow-y-auto overscroll-contain"
        desktopClassName="sm:max-w-lg sm:max-h-[min(48rem,90dvh)] sm:overflow-y-auto"
      >
        <ResponsiveDialogPanel
          title="Account settings"
          description="Email, password, signed-in devices and privacy."
        >
          <div className="flex min-w-0 flex-col divide-y divide-border/60 px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 [&>section:first-child]:pt-2">
            <EmailSection email={profile.email} emailVerified={profile.email_verified} />
            <PasswordSection email={profile.email} />
            {open ? <SessionsSection /> : null}
            {onOpenBlocked ? (
              <SettingsSection title="Privacy">
                <button
                  type="button"
                  onClick={onOpenBlocked}
                  className="-mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ShieldOff aria-hidden className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground">Blocked users</span>
                    <span className="text-xs text-muted-foreground">
                      See and unblock people you&apos;ve blocked
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                </button>
              </SettingsSection>
            ) : null}
            <DeleteAccountSection />
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
