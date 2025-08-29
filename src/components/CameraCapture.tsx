"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CameraCapture as CameraCaptureType } from "@/types";
import { Camera, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import CameraComponent, { FACING_MODES } from "react-html5-camera-photo";
import "react-html5-camera-photo/build/css/index.css";
import { toast } from "sonner";

interface CameraCaptureProps {
  onPhotoCapture: (capture: CameraCaptureType) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function CameraCapture({
  onPhotoCapture,
  onCancel,
  disabled = false,
  className = "",
}: CameraCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Validate file before processing
  const validateFile = (file: File): boolean => {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please capture a valid photo (JPEG, PNG, or WebP)",
      });
      return false;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Photo must be smaller than 5MB",
      });
      return false;
    }

    return true;
  };

  // Handle photo capture from react-html5-camera-photo
  const handleTakePhoto = async (dataUri: string) => {
    try {
      setIsProcessing(true);

      // Convert data URI to blob
      const response = await fetch(dataUri);
      const blob = await response.blob();

      // Create file from blob
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      // Validate the file
      if (!validateFile(file)) {
        setIsProcessing(false);
        return;
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Create compressed version for better performance
      const compressedFile = await compressImage(file);

      // Create the capture object
      const capture: CameraCaptureType = {
        file: file,
        compressed: compressedFile,
        preview: previewUrl,
      };

      // Pass to parent component
      onPhotoCapture(capture);

      // Close camera modal
      setShowCameraModal(false);
    } catch (error) {
      console.error("Error processing captured photo:", error);
      toast.error("Failed to process photo", {
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Compress image for better performance
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions (max 1200px on longest side)
        let { width, height } = img;
        const maxWidth = 1200;
        const maxHeight = 1200;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                `compressed-${file.name}`,
                {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.8 // 80% quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Handle camera error
  const handleCameraError = (error: Error) => {
    console.error("Camera error:", error);
    setCameraError(error.message || "Failed to access camera");
    toast.error("Camera access failed", {
      description: "Please allow camera access to take photos.",
    });
  };

  // Switch between front and back camera
  const switchCamera = () => {
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
  };

  // Reset camera state
  const resetCamera = () => {
    setPreview(null);
    setCameraError(null);
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera Modal */}
      <Dialog
        open={showCameraModal}
        onOpenChange={(open) => {
          setShowCameraModal(open);
          if (!open) {
            resetCamera();
            onCancel?.();
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take Photo
            </DialogTitle>
            <DialogDescription>
              Capture a photo using your device camera
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            {showCameraModal && (
              <div className="relative w-full" style={{ height: "300px" }}>
                <style jsx>{`
                  :global(.react-html5-camera-photo) {
                    width: 100% !important;
                    height: 100% !important;
                    position: relative;
                  }
                  :global(.react-html5-camera-photo > video) {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  }
                  :global(.react-html5-camera-photo > img) {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  }
                `}</style>
                <CameraComponent
                  onTakePhoto={handleTakePhoto}
                  onCameraError={handleCameraError}
                  idealFacingMode={
                    facingMode === "environment"
                      ? FACING_MODES.ENVIRONMENT
                      : FACING_MODES.USER
                  }
                  isFullscreen={false}
                  isImageMirror={false}
                  isDisplayStartCameraError={true}
                />

                {/* Camera controls overlay - Improved design */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-between items-center px-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCameraModal(false)}
                    disabled={isProcessing}
                    className="bg-black/70 hover:bg-black text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white/30"
                  >
                    <X className="h-8 w-8" />
                  </Button>

                  <div className="invisible w-16 h-16"></div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={switchCamera}
                    disabled={isProcessing}
                    className="bg-black/70 hover:bg-black text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white/30"
                  >
                    <RotateCcw className="h-8 w-8" />
                  </Button>
                </div>
              </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white">Processing...</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview or Take Photo Button */}
      {preview ? (
        // Preview state
        <div className="space-y-4">
          <div className="relative">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto rounded-lg object-cover max-h-64"
              />
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={resetCamera}
              disabled={isProcessing}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        // Take Photo Button
        <div className="space-y-4">
          {cameraError && (
            <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded">
              {cameraError}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCameraModal(true)}
            disabled={isProcessing || disabled}
            className="w-full flex items-center justify-center gap-2"
          >
            <Camera className="h-5 w-5" />
            <span>Take Photo</span>
          </Button>
        </div>
      )}
    </div>
  );
}
