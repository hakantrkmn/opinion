"use client";

import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadCommentPhotoViaApi } from "@/lib/upload-client";
import type {
  CameraCapture as CameraCaptureType,
  Comment,
  EnhancedComment,
} from "@/types";
import { Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CommentEditFormProps {
  comment: Comment | EnhancedComment;
  onSave: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  onCancel: () => void;
  currentUserId: string;
}

export default function CommentEditForm({
  comment,
  onSave,
  onCancel,
  currentUserId,
}: CommentEditFormProps) {
  const [editText, setEditText] = useState(comment.text);
  const [editPhotoAction, setEditPhotoAction] = useState<
    "keep" | "remove" | "replace"
  >("keep");
  const [editCapturedPhoto, setEditCapturedPhoto] =
    useState<CameraCaptureType | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  const handleEditPhotoCapture = (capturedPhoto: CameraCaptureType) => {
    setEditCapturedPhoto(capturedPhoto);
    setEditPhotoAction("replace");
  };

  const handleRemoveEditPhoto = () => {
    setEditCapturedPhoto(null);
    if (comment.photo_url) {
      setEditPhotoAction("remove");
    } else {
      setEditPhotoAction("keep");
    }
  };

  const handleCancelEdit = () => {
    setEditText(comment.text);
    setEditPhotoAction("keep");
    setEditCapturedPhoto(null);
    onCancel();
  };

  const handleEdit = async () => {
    if (!editText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setIsUploadingEdit(true);

    try {
      let photoUrl: string | null | undefined;
      let photoMetadata: Record<string, unknown> | undefined;

      if (editPhotoAction === "remove") {
        photoUrl = null;
        if (comment.photo_url) {
          // Photo cleanup handled server-side
        }
      } else if (editPhotoAction === "replace" && editCapturedPhoto) {
          const uploadResult = await uploadCommentPhotoViaApi(
          editCapturedPhoto.file
        );

        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
          photoMetadata = uploadResult.metadata;

          if (comment.photo_url) {
            // Photo cleanup handled server-side
          }
        } else {
          throw new Error(uploadResult.error || "Photo upload failed");
        }
      }

      const success = await onSave(
        comment.id,
        editText.trim(),
        photoUrl,
        photoMetadata
      );
      if (success) {
        setEditPhotoAction("keep");
        setEditCapturedPhoto(null);
        toast.success("Comment updated successfully");
      } else {
        toast.error("Failed to update comment");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment"
      );
    } finally {
      setIsUploadingEdit(false);
    }
  };

  return (
    <div className="space-y-3 min-w-0 overflow-hidden">
      {/* Text editing */}
      <Textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        placeholder="Edit your comment..."
        rows={3}
        className="w-full break-all"
      />

      {/* Photo management section */}
      <div className="space-y-2">
        {/* Current photo display */}
        {comment.photo_url && editPhotoAction !== "remove" && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <img
              src={comment.photo_url}
              alt="Current photo"
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded border"
              loading="lazy"
              decoding="async"
              style={{ width: "48px", height: "48px" }}
            />
            <div className="flex-1 text-sm text-muted-foreground">
              Current photo
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditPhotoAction("remove")}
              className="h-8 text-xs"
            >
              Remove
            </Button>
          </div>
        )}

        {/* New photo preview */}
        {editCapturedPhoto && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
            <img
              src={editCapturedPhoto.preview}
              alt="New photo preview"
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded border"
              loading="lazy"
              decoding="async"
              style={{ width: "48px", height: "48px" }}
            />
            <div className="flex-1 text-sm text-primary">
              {comment.photo_url
                ? "Replacing with new photo"
                : "New photo ready"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveEditPhoto}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        )}

        {/* Photo removed indicator */}
        {editPhotoAction === "remove" && comment.photo_url && (
          <div className="flex items-center gap-2 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="w-12 h-12 flex items-center justify-center bg-destructive/10 rounded border">
              <X className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 text-sm text-destructive">
              Photo will be removed
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditPhotoAction("keep")}
              className="h-8 text-xs"
            >
              Undo
            </Button>
          </div>
        )}

        {/* Camera capture for adding/replacing photo */}
        {(!comment.photo_url || editPhotoAction === "remove") &&
          !editCapturedPhoto && (
            <CameraCapture
              onPhotoCapture={handleEditPhotoCapture}
              className="w-full"
            />
          )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:justify-end">
        <Button
          onClick={handleEdit}
          size="sm"
          disabled={isUploadingEdit}
          className="text-xs sm:text-sm"
        >
          {isUploadingEdit ? (
            <>
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Save
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelEdit}
          disabled={isUploadingEdit}
          className="text-xs sm:text-sm"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
