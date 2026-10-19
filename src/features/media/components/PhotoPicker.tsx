"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { compressImage } from "../lib/compress";

interface PhotoPickerProps {
  /** Receives the compressed photo. */
  onPick: (file: File) => void;
  disabled?: boolean;
  className?: string;
  /** Icon-only trigger (for compact composers). */
  compact?: boolean;
}

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * Photo input: the native camera on touch devices, a webcam dialog (with a
 * "choose a file" fallback) on desktop. Output is always compressed.
 */
export function PhotoPicker({
  onPick,
  disabled = false,
  className,
  compact = false,
}: PhotoPickerProps) {
  const [processing, setProcessing] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setProcessing(true);
      try {
        onPick(await compressImage(file));
        setWebcamOpen(false);
      } catch (error) {
        toast.error("Couldn't use this photo", {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setProcessing(false);
      }
    },
    [onPick]
  );

  const open = () => {
    if (isTouchDevice()) cameraInputRef.current?.click();
    else setWebcamOpen(true);
  };

  const busy = processing || disabled;

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size={compact ? "icon" : "default"}
        onClick={open}
        disabled={busy}
        className={cn(compact ? "size-10 shrink-0 rounded-xl" : "h-11 w-full gap-2 rounded-xl border-dashed text-muted-foreground hover:text-foreground", className)}
        aria-label="Add a photo"
        title={compact ? "Add a photo" : undefined}
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {compact ? null : <span>{processing ? "Processing…" : "Add a photo"}</span>}
      </Button>

      <Dialog open={webcamOpen} onOpenChange={setWebcamOpen}>
        <DialogContent className="z-(--z-dialog-nested) gap-0 p-0 sm:max-w-md" overlayClassName="z-(--z-dialog-nested)">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take a photo
            </DialogTitle>
            <DialogDescription>
              Use your camera, or choose an existing photo.
            </DialogDescription>
          </DialogHeader>
          {webcamOpen ? (
            <Webcam
              busy={processing}
              onCapture={(file) => void handleFile(file)}
              onChooseFile={() => fileInputRef.current?.click()}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Webcam({
  busy,
  onCapture,
  onChooseFile,
}: {
  busy: boolean;
  onCapture: (file: File) => void;
  onChooseFile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setStatus("starting");
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1600 }, height: { ideal: 1200 } },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play().catch(() => {});
        }
        setStatus("live");
      })
      .catch(() => !cancelled && setStatus("error"));
    if (!navigator.mediaDevices) setStatus("error");

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-3 p-4 pt-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {status !== "live" ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {status === "starting" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Camera unavailable. Allow camera access or choose a file instead."
            )}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={status !== "live" || busy}
          aria-label="Switch camera"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 gap-2 rounded-xl"
          onClick={onChooseFile}
          disabled={busy}
        >
          <Upload className="h-4 w-4" />
          Choose file
        </Button>
        <Button
          type="button"
          className="h-10 flex-1 gap-2 rounded-xl"
          onClick={capture}
          disabled={status !== "live" || busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Capture
        </Button>
      </div>
    </div>
  );
}
