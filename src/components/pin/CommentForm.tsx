"use client";

import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadCommentPhotoViaApi } from "@/lib/upload-client";
import type { CameraCapture as CameraCaptureType } from "@/types";
import { Loader2, LogIn, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CommentFormProps {
  onSubmit: (
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  disabled?: boolean;
  pinId: string;
  currentUserId: string;
  userAlreadyCommented: boolean;
}

export default function CommentForm({
  onSubmit,
  disabled,
  currentUserId,
  userAlreadyCommented,
}: CommentFormProps) {
  const [newComment, setNewComment] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureType | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [newComment]);

  const handlePhotoCapture = (capture: CameraCaptureType) => {
    setCapturedPhoto(capture);
  };

  const handleRemovePhoto = () => {
    if (capturedPhoto?.preview) {
      URL.revokeObjectURL(capturedPhoto.preview);
    }
    setCapturedPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !capturedPhoto) {
      toast.info("Add text or photo", {
        description: "Please write something or capture a photo",
      });
      return;
    }

    if (!currentUserId) {
      toast.info("Sign in to add comments", {
        description: "Create an account to share your thoughts",
        action: {
          label: "Sign In",
          onClick: () => (window.location.href = "/auth"),
        },
      });
      return;
    }

    const commentText = newComment.trim();
    setIsUploading(true);
    setNewComment("");

    try {
      let photoUrl: string | undefined;
      let photoMetadata: Record<string, unknown> | undefined;

      if (capturedPhoto) {
        const uploadResult = await uploadCommentPhotoViaApi(
          capturedPhoto.file
        );

        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
          photoMetadata = uploadResult.metadata;
        } else {
          throw new Error(uploadResult.error || "Photo upload failed");
        }
      }

      const success = await onSubmit(commentText, photoUrl, photoMetadata);

      if (success) {
        if (capturedPhoto) {
          handleRemovePhoto();
        }

        setTimeout(() => {
          const input = document.querySelector(
            'input[placeholder="Share your thoughts..."]'
          ) as HTMLInputElement;
          if (input) input.focus();
        }, 100);

        toast.success("Comment added!", {
          description: capturedPhoto
            ? "Comment with photo posted"
            : "Comment posted",
        });
      } else {
        setNewComment(commentText);
      }
    } catch (error) {
      console.error("Comment submission error:", error);
      setNewComment(commentText);
      toast.error("Failed to add comment", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-dashed border-border/50">
        <div className="flex items-center gap-2">
          <LogIn className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground">
            Sign in to share your thoughts
          </span>
        </div>
        <Button asChild size="sm" className="rounded-lg h-8 px-3 text-xs font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]">
          <Link href="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (userAlreadyCommented) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/20 rounded-xl border border-dashed border-border/40">
        <div className="text-center">
          <MessageCircle className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
          <h3 className="text-xs font-semibold text-foreground/80 mb-0.5">
            You already commented
          </h3>
          <p className="text-[11px] text-muted-foreground/60">
            Edit or delete your existing comment above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Photo Preview */}
      {capturedPhoto && (
        <div className="flex items-center gap-2.5 p-2 bg-muted/20 rounded-xl border border-border/30">
          <img
            src={capturedPhoto.preview}
            alt="Captured photo preview"
            width={40}
            height={40}
            className="w-10 h-10 object-cover rounded-lg"
            loading="lazy"
            decoding="async"
            style={{ width: "40px", height: "40px" }}
          />
          <div className="flex-1 text-xs text-muted-foreground">
            Photo ready
          </div>
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.90] cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Comment Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          className="min-h-[44px] max-h-[120px] w-full text-sm resize-none overflow-hidden rounded-xl border-border/50"
          disabled={isUploading || disabled}
          rows={1}
        />

        <div className="flex items-center justify-end gap-2">
          {!capturedPhoto && (
            <CameraCapture
              onPhotoCapture={handlePhotoCapture}
              disabled={isUploading || disabled}
              className="flex-shrink-0"
            />
          )}

          <Button
            type="submit"
            disabled={
              (!newComment.trim() && !capturedPhoto) || isUploading || disabled
            }
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-medium gap-1.5 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] disabled:opacity-40 disabled:shadow-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.93]"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
