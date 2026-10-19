"use client";

import { Button } from "@/components/ui/button";
import { ReportContentButton } from "@/features/moderation/components/ReportContentButton";
import type { PinSummary } from "@/types/api";
import { Navigation, Share2 } from "lucide-react";
import { toast } from "sonner";

const pressable =
  "h-9 gap-1.5 rounded-xl px-3 text-xs font-medium transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] pointer-coarse:h-10";

export function PinActions({ pin }: { pin: PinSummary }) {
  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const share = async () => {
    const url = `${window.location.origin}/pin/${pin.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: pin.name, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: pin.name });
    } catch {
      toast.info("Share this link", { description: url, duration: 8000 });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className={pressable} onClick={openDirections}>
        <Navigation className="h-3.5 w-3.5" />
        Directions
      </Button>
      <Button size="sm" variant="outline" className={pressable} onClick={share}>
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
      <ReportContentButton ownerId={pin.user.id} targetId={pin.id} targetType="pin" />
    </div>
  );
}
