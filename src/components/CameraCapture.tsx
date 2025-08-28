"use client";

import { Button } from "@/components/ui/button";
import type { CameraCapture as CameraCaptureType } from "@/types";
import { Camera, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCameraUI, setShowCameraUI] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment"); // Default to back camera

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

    // Strict validation: Only accept recently taken photos (camera capture)
    const fileAge = Date.now() - file.lastModified;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (fileAge > maxAge) {
      toast.error("Photo must be taken instantly", {
        description:
          "Please use your camera to take a new photo right now. Gallery photos are not allowed.",
      });
      return false;
    }

    return true;
  };

  // Create preview URL
  const createPreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // Start camera stream for both mobile and desktop users
  const startCameraStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      setShowCameraUI(true);

      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error("Failed to access camera:", error);
      toast.error("Camera access failed", {
        description: "Please allow camera access to take photos.",
      });
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  // Stop camera stream
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCameraUI(false);
  };

  // Switch between front and back camera
  const switchCamera = async () => {
    if (stream) {
      // Stop current stream
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    // Toggle facing mode
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);

    // Start stream with new facing mode
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error("Failed to switch camera:", error);
      toast.error("Camera switch failed", {
        description: "Could not access the other camera.",
      });
      // Revert to original facing mode
      setFacingMode(facingMode);
    }
  };

  // Capture photo from camera stream
  const captureFromStream = () => {
    if (!videoRef.current || !stream) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Canvas not supported");
      return;
    }

    // Set canvas dimensions to video dimensions
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }

        // Create file from blob
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        // Stop camera stream
        stopCameraStream();

        // Process the captured file
        await processFile(file);
      },
      "image/jpeg",
      0.9
    );
  };

  // Process captured or selected file
  const processFile = async (file: File) => {
    console.log("Processing file:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
    });

    // Validate the file
    if (!validateFile(file)) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create preview
      const previewUrl = createPreview(file);
      setPreview(previewUrl);

      // Create capture object
      const capture: CameraCaptureType = {
        file,
        preview: previewUrl,
      };

      // Call parent callback
      onPhotoCapture(capture);

      toast.success("Photo captured!", {
        description: "Photo ready for upload",
      });
    } catch (error) {
      console.error("Error processing photo:", error);
      toast.error("Processing failed", {
        description: "Failed to process the captured photo",
      });
    } finally {
      setIsProcessing(false);
      // Reset input for next capture
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file selection from input
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);
  };

  // Trigger camera - simplified for both mobile and desktop
  const triggerCamera = async () => {
    if (disabled || isProcessing) return;
    
    await startCameraStream();
  };

  // Clear preview and stop camera
  const clearPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }

    // Stop camera stream if active
    stopCameraStream();

    if (onCancel) {
      onCancel();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [stream, preview]);

  return (
    <div className={`camera-capture ${className}`}>
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Use rear camera (mobile)
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={disabled || isProcessing}
      />

      {/* Camera UI - Full Screen */}
      {showCameraUI && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Video */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-center items-center gap-6">
              {/* Cancel */}
              <Button
                type="button"
                onClick={stopCameraStream}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black bg-black/50"
                size="lg"
              >
                Cancel
              </Button>

              {/* Capture */}
              <Button
                type="button"
                onClick={captureFromStream}
                disabled={isProcessing}
                className="bg-white text-black hover:bg-gray-200 px-8"
                size="lg"
              >
                {isProcessing ? "Processing..." : "Capture"}
              </Button>

              {/* Switch Camera */}
              <Button
                type="button"
                onClick={switchCamera}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black bg-black/50"
                size="lg"
              >
                🔄
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Camera trigger button */}
      {!preview && !showCameraUI && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerCamera}
          disabled={disabled || isProcessing}
          className="flex items-center gap-2"
          title="Take photo"
        >
          <Camera className="h-4 w-4" />
          <span className="text-sm">
            {isProcessing ? "Processing..." : "Take Photo"}
          </span>
        </Button>
      )}

      {/* Preview display */}
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Captured photo preview"
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={clearPreview}
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
            title="Remove photo"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
