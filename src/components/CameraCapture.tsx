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
import { isMobileDevice } from "@/utils/geolocation";
import { Camera, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PhotoPreview from "./camera/PhotoPreview";

interface CameraCaptureProps {
  onPhotoCapture: (capture: CameraCaptureType) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

function validateFile(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error("Invalid file type", {
      description: "Please capture a valid photo (JPEG, PNG, or WebP)",
    });
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error("File too large", {
      description: "Photo must be smaller than 5MB",
    });
    return false;
  }
  return true;
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(file);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = (height * MAX_DIMENSION) / width;
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = (width * MAX_DIMENSION) / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(
              new File([blob], `compressed-${file.name}`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

async function processFile(file: File): Promise<CameraCaptureType | null> {
  if (!validateFile(file)) return null;

  const previewUrl = URL.createObjectURL(file);
  const compressed = await compressImage(file);

  return { file, compressed, preview: previewUrl };
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
  const [isMobile, setIsMobile] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detect mobile device
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window;
    setIsMobile(isMobileDevice() || isTouchDevice);
  }, []);

  // Start camera stream (for desktop)
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Camera access failed", {
        description: "Please allow camera access to take photos.",
      });
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Handle photo capture from native camera / file input
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const capture = await processFile(file);
      if (capture) {
        setPreview(capture.preview);
        onPhotoCapture(capture);
      }
    } catch (error) {
      console.error("Error processing captured photo:", error);
      toast.error("Failed to process photo", {
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Capture photo from video stream (for desktop)
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          const file = new File(
            [blob],
            `camera-capture-${Date.now()}.jpg`,
            { type: "image/jpeg", lastModified: Date.now() }
          );

          const capture = await processFile(file);
          if (capture) {
            setPreview(capture.preview);
            onPhotoCapture(capture);
          }

          setShowCameraModal(false);
          stopCamera();
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo", {
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch between front and back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    if (stream) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  // Open camera (mobile: native, desktop: modal)
  const openCamera = () => {
    if (isMobile) {
      fileInputRef.current?.click();
    } else {
      setShowCameraModal(true);
    }
  };

  // Reset camera state
  const resetCamera = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onCancel?.();
  };

  // Start camera when modal opens (desktop)
  useEffect(() => {
    if (showCameraModal && !isMobile) startCamera();
    return () => {
      if (!isMobile) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCameraModal, isMobile]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden file input for native camera (mobile only) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* Hidden canvas for photo capture (desktop only) */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Camera Modal (desktop only) */}
      <Dialog
        open={showCameraModal}
        onOpenChange={(open) => {
          setShowCameraModal(open);
          if (!open) {
            stopCamera();
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
            <div className="relative w-full" style={{ height: "300px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />

              {/* Camera controls overlay */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-between items-center px-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCameraModal(false)}
                  disabled={isProcessing}
                  className="bg-foreground/70 hover:bg-foreground text-background rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-background/30"
                >
                  <X className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="bg-background hover:bg-muted text-foreground rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-background/30"
                >
                  <Camera className="h-6 w-6" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={switchCamera}
                  disabled={isProcessing}
                  className="bg-foreground/70 hover:bg-foreground text-background rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-background/30"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center rounded-lg">
                  <div className="text-background">Processing...</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview or Take Photo Button */}
      {preview ? (
        <PhotoPreview
          previewUrl={preview}
          onRemove={resetCamera}
          disabled={isProcessing}
        />
      ) : (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={openCamera}
            disabled={isProcessing || disabled}
            className="w-full flex items-center justify-center gap-2"
          >
            <Camera className="h-5 w-5" />
            <span>{isProcessing ? "Processing..." : "Take Photo"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
