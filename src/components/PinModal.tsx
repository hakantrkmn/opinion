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
import type { CameraCapture as CameraCaptureType, PinModalProps } from "@/types";
import { Camera, LogIn, MapPin, X } from "lucide-react";
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
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useSession();

  const handlePhotoCapture = (photo: CameraCaptureType) => {
    console.log('Photo captured in PinModal:', {
      fileName: photo.file.name,
      fileSize: photo.file.size,
      fileType: photo.file.type,
      hasCompressed: !!photo.compressed
    });
    setCapturedPhoto(photo);
  };

  const handleRemovePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('PinModal form submitted');
    if (!user) return; // Shouldn't happen due to UI, but safety check

    if (pinName.trim() && comment.trim()) {
      setIsUploading(true);
      try {
        let photoData: { photo?: File; photoMetadata?: { file_size: number; width?: number; height?: number; format: string; } } = {};

        if (capturedPhoto) {
          // Use compressed photo if available, otherwise original
          const photoFile = capturedPhoto.compressed || capturedPhoto.file;
          
          photoData = {
            photo: photoFile,
            photoMetadata: {
              file_size: photoFile.size,
              width: capturedPhoto.compressed ? 1200 : undefined, // Assume compressed width
              height: capturedPhoto.compressed ? undefined : undefined,
              format: photoFile.type.split('/')[1] || 'webp',
            }
          };
          
          console.log('Sending photo data to createPin:', {
            hasPhoto: true,
            fileName: photoFile.name,
            fileSize: photoFile.size,
            photoMetadata: photoData.photoMetadata
          });
        } else {
          console.log('No photo data to send');
        }

        await onCreatePin({
          pinName: pinName.trim(),
          comment: comment.trim(),
          ...photoData,
        });
        
        // Reset form
        setPinName("");
        setComment("");
        setCapturedPhoto(null);
      } catch (error) {
        console.error('Error creating pin:', error);
        toast.error('Failed to create pin. Please try again.');
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              Create an account or sign in to share your thoughts about
              locations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">📍</div>
              <p className="text-sm text-muted-foreground">
                Join the community to create pins, leave comments, and vote on
                others&apos; opinions!
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button asChild className="flex-1">
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            What is your oPINion?
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about this location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pinName">Pin Name</Label>
            <Input
              id="pinName"
              type="text"
              value={pinName}
              onChange={(e) => setPinName(e.target.value)}
              placeholder="Give your pin a name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What do you think about this location?"
              rows={4}
              required
            />
          </div>

          {/* Photo Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Add Photo (Optional)
            </Label>
            
            {/* Photo Preview */}
            {capturedPhoto && (
              <div className="relative inline-block">
                <img
                  src={capturedPhoto.preview}
                  alt="Captured photo"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Camera Capture */}
            {!capturedPhoto && (
              <CameraCapture
                onPhotoCapture={handlePhotoCapture}
                className="w-full"
              />
            )}
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? 'Creating...' : 'Create Pin'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
