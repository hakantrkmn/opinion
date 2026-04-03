"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CommentActionsProps {
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
  isEditing: boolean;
}

export default function CommentActions({
  isOwner,
  onEdit,
  onDelete,
  isEditing,
}: CommentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOwner || isEditing) return null;

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const success = await onDelete();
      if (success) {
        toast.success("Comment deleted");
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        disabled={isDeleting}
        className="h-7 sm:h-8 text-xs sm:text-sm"
      >
        <Edit2 className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            className="h-7 sm:h-8 text-xs sm:text-sm text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            <span className="hidden sm:inline">{isDeleting ? "Deleting..." : "Delete"}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
