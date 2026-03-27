"use client";

import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import type {
  CameraCapture as CameraCaptureType,
  PinModalProps,
} from "@/types";
import { Camera, ImagePlus, LogIn, MapPin, X } from "lucide-react";
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
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="p-6">
            <DialogHeader className="space-y-0 mb-6">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <LogIn className="h-4.5 w-4.5 text-white" />
                </div>
                Sign In Required
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm">
                Create an account or sign in to share your thoughts
              </DialogDescription>
            </DialogHeader>

            <div className="text-center py-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-8 w-8 text-indigo-500" />
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
                className="flex-1 h-11 rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button asChild className="flex-1 h-11 rounded-xl font-medium bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 border-none text-white shadow-md">
                <Link href="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Authenticated user UI
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />
        <div className="p-6">
          <DialogHeader className="space-y-0 mb-5">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md">
                <MapPin className="h-4.5 w-4.5 text-white" />
              </div>
              What is your oPINion?
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm">
              Share your thoughts about this location
            </DialogDescription>
          </DialogHeader>

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
                placeholder="Give your pin a name..."
                required
                maxLength={100}
                className="h-11 rounded-xl border-border/60 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-colors"
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
                className="rounded-xl border-border/60 focus:border-indigo-500/50 focus:ring-indigo-500/20 resize-none transition-colors"
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
                className="flex-1 h-11 rounded-xl font-medium"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 rounded-xl font-medium bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 border-none text-white shadow-md transition-all"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  "Create Pin"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
