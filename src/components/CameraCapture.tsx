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
import { useEffect, useRef, useState } from "react";
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isMobile, setIsMobile] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window;
      setIsMobile(isMobileDevice || isTouchDevice);
    };
    
    checkMobile();
  }, []);

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

  // Handle photo capture from native camera
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);

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
    } catch (error) {
      console.error("Error processing captured photo:", error);
      toast.error("Failed to process photo", {
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  // Start camera stream (for desktop)
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
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
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture photo from video stream (for desktop)
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsProcessing(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

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

        // Close camera modal and stop stream
        setShowCameraModal(false);
        stopCamera();
      }, 'image/jpeg', 0.8);
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
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
    
    // Restart camera with new facing mode
    if (stream) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  // Open camera (mobile: native, desktop: modal)
  const openCamera = () => {
    if (isMobile) {
      // Mobile: use native camera
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // Desktop: open camera modal
      setShowCameraModal(true);
    }
  };

  // Reset camera state
  const resetCamera = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onCancel?.();
  };

  // Start camera when modal opens (for desktop)
  useEffect(() => {
    if (showCameraModal && !isMobile) {
      startCamera();
    }
    return () => {
      if (!isMobile) {
        stopCamera();
      }
    };
  }, [showCameraModal, isMobile]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      {/* Hidden file input for native camera (mobile only) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Hidden canvas for photo capture (desktop only) */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

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
                  className="bg-black/70 hover:bg-black text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-white/30"
                >
                  <X className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="bg-white hover:bg-gray-100 text-black rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white/30"
                >
                  <Camera className="h-6 w-6" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={switchCamera}
                  disabled={isProcessing}
                  className="bg-black/70 hover:bg-black text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-white/30"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-white">Processing...</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview or Take Photo Button */}
      {preview ? (
        // Preview state
        <div className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto rounded-lg object-cover max-h-64"
            />
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
          <Button
            type="button"
            variant="outline"
            onClick={openCamera}
            disabled={isProcessing || disabled}
            className="w-full flex items-center justify-center gap-2"
          >
            <Camera className="h-5 w-5" />
            <span>{isProcessing ? 'Processing...' : 'Take Photo'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
