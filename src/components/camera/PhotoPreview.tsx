"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PhotoPreviewProps {
  previewUrl: string;
  onRemove: () => void;
  disabled?: boolean;
}

export default function PhotoPreview({
  previewUrl,
  onRemove,
  disabled = false,
}: PhotoPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-auto rounded-lg object-cover max-h-64"
          style={{ width: "100%", height: "auto", maxHeight: "16rem" }}
          loading="lazy"
          decoding="async"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="absolute top-2 right-2 bg-foreground/50 hover:bg-foreground/70 text-background rounded-full w-8 h-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
