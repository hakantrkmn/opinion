"use client";

import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import type {
  CameraCapture as CameraCaptureType,
  PinModalProps,
} from "@/types";
import { PinIcon } from "@/components/icons/PinIcon";
import { ImagePlus, LogIn, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function PinModal({
  isOpen,
  onClose,
  onCreatePin,
}: PinModalProps) {
  const [pinName, setPinName] = useState("");
  const [comment, setComment] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureType | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useSession();

  const handlePhotoCapture = (photo: CameraCaptureType) => {
    setCapturedPhoto(photo);
  };

  const handleRemovePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (pinName.trim() && comment.trim()) {
      setIsUploading(true);
      try {
        let photoData: {
          photo?: File;
          photoMetadata?: {
            file_size: number;
            width?: number;
            height?: number;
            format: string;
          };
        } = {};

        if (capturedPhoto) {
          const photoFile = capturedPhoto.compressed || capturedPhoto.file;

          photoData = {
            photo: photoFile,
            photoMetadata: {
              file_size: photoFile.size,
              width: capturedPhoto.compressed ? 1200 : undefined,
              height: capturedPhoto.compressed ? undefined : undefined,
              format: photoFile.type.split("/")[1] || "webp",
            },
          };
        }

        await onCreatePin({
          pinName: pinName.trim(),
          comment: comment.trim(),
          ...photoData,
        });

        setPinName("");
        setComment("");
        setCapturedPhoto(null);
      } catch (error) {
        console.error("Error creating pin:", error);
        toast.error("Failed to create pin. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleClose = () => {
    setPinName("");
    setComment("");
    setCapturedPhoto(null);
    onClose();
  };

  // Non-authenticated user UI
  if (!user) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
        <ResponsiveDialogContent desktopClassName="max-w-md">
          <ResponsiveDialogPanel
            title={
              <span className="flex items-center gap-2.5 text-lg font-bold">
                <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                  <LogIn className="h-4.5 w-4.5 text-background" />
                </div>
                Sign In Required
              </span>
            }
            description="Create an account or sign in to share your thoughts"
          >
          <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="text-center py-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <PinIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                Join the community to create pins, leave comments, and vote on
                others&apos; opinions!
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button asChild className="flex-1 h-11 rounded-xl font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]">
                <Link href="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
          </ResponsiveDialogPanel>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  // Authenticated user UI
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[92dvh] overflow-y-auto"
        desktopClassName="max-w-md"
      >
        <ResponsiveDialogPanel
          title={
            <span className="flex items-center gap-2.5 text-lg font-bold">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)]">
                <PinIcon className="h-4.5 w-4.5 text-white" />
              </div>
              What is your oPINion?
            </span>
          }
          description="Share your thoughts about this location"
        >
        <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pinName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pin Name
              </Label>
              <Input
                id="pinName"
                type="text"
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder="Name this place..."
                required
                maxLength={100}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground/60 text-right tabular-nums">
                {pinName.length}/100
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Comment
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What do you think about this location?"
                rows={3}
                required
                className="rounded-xl resize-none"
              />
            </div>

            {/* Photo Section */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" />
                Photo (Optional)
              </Label>

              {capturedPhoto && (
                <div className="relative inline-block rounded-xl overflow-hidden border border-border/60 shadow-sm">
                  <img
                    src={capturedPhoto.preview}
                    alt="Captured photo"
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover"
                    loading="lazy"
                    decoding="async"
                    style={{ width: "96px", height: "96px" }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full shadow-md"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {!capturedPhoto && (
                <CameraCapture
                  onPhotoCapture={handlePhotoCapture}
                  onCancel={handleRemovePhoto}
                  className="w-full"
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 rounded-xl font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  "Create Pin"
                )}
              </Button>
            </div>
          </form>
        </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
