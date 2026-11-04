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
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CompressError, MAX_ORIGINAL_BYTES, compressImage } from "../lib/compress";

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
  const t = useTranslations("media");
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
        toast.error(t("picker.photoFailed"), {
          description:
            error instanceof CompressError
              ? t(`errors.${error.code}`, { maxMb: String(MAX_ORIGINAL_BYTES / 1024 / 1024) })
              : error instanceof Error
                ? error.message
                : undefined,
        });
      } finally {
        setProcessing(false);
      }
    },
    [onPick, t]
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
        aria-label={t("picker.addPhoto")}
        title={compact ? t("picker.addPhoto") : undefined}
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {compact ? null : <span>{processing ? t("picker.processing") : t("picker.addPhoto")}</span>}
      </Button>

      <Dialog open={webcamOpen} onOpenChange={setWebcamOpen}>
        <DialogContent className="z-(--z-dialog-nested) gap-0 p-0 sm:max-w-md" overlayClassName="z-(--z-dialog-nested)">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t("webcam.title")}
            </DialogTitle>
            <DialogDescription>
              {t("webcam.description")}
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
  const t = useTranslations("media.webcam");
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
              t("unavailable")
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
          aria-label={t("switchCamera")}
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
          {t("chooseFile")}
        </Button>
        <Button
          type="button"
          className="h-10 flex-1 gap-2 rounded-xl"
          onClick={capture}
          disabled={status !== "live" || busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {t("capture")}
        </Button>
      </div>
    </div>
  );
}
