"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useMapUiStore } from "../store/ui-store";

export function SignInPrompt() {
  const open = useMapUiStore((s) => s.signInPromptOpen);
  const setOpen = useMapUiStore((s) => s.setSignInPromptOpen);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-sm">
        <ResponsiveDialogPanel
          title="Sign in to join in"
          description="Drop pins, comment, vote and follow people with a free account."
        >
          <div className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex justify-center py-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <PinIcon className="h-7 w-7 text-primary" />
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setOpen(false)}
              >
                Not now
              </Button>
              <Button asChild className="h-11 flex-1 rounded-xl">
                <Link href="/auth" onClick={() => setOpen(false)}>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
