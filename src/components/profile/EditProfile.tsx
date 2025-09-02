"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/hooks/useUserProfile";
import { userService } from "@/lib/supabase/userService";
import type { User } from "@supabase/supabase-js";
import { Camera, Loader2, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate: (updates: {
    display_name?: string;
    avatar_url?: string | null;
  }) => void;
}

export function EditProfile({
  user,
  isOpen,
  onClose,
  onProfileUpdate,
}: EditProfileProps) {
  const { profile } = useUserProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Update state when profile data loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { avatarUrl: newAvatarUrl, error } = await userService.uploadAvatar(
        user.id,
        file
      );

      if (error) {
        toast.error("Avatar upload failed", {
          description: error,
        });
        return;
      }

      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        toast.success("Avatar uploaded successfully!");
      }
    } catch {
      toast.error("Avatar upload failed", {
        description: "An unexpected error occurred",
      });
    } finally {
      setUploading(false);
      // Clear the input so the same file can be selected again
      event.target.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    setDeleting(true);
    try {
      const { success, error } = await userService.deleteAvatar(user.id);

      if (error) {
        toast.error("Failed to delete avatar", {
          description: error,
        });
        return;
      }

      if (success) {
        setAvatarUrl("");
        toast.success("Avatar deleted successfully!");
      }
    } catch {
      toast.error("Failed to delete avatar", {
        description: "An unexpected error occurred",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update display name if changed
      const currentDisplayName = profile?.display_name || "";

      let success = true;
      let error = null;

      if (displayName.trim() !== currentDisplayName) {
        const result = await userService.updateDisplayName(
          user.id,
          displayName
        );
        if (!result.success) {
          success = false;
          error = result.error;
        }
      }

      if (!success) {
        toast.error("Failed to save changes", {
          description: error,
        });
        return;
      }

      // Call parent's update handler
      onProfileUpdate({
        display_name: displayName,
        avatar_url: avatarUrl || null,
      });

      toast.success("Profile updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to save changes", {
        description: "An unexpected error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    displayName.trim() !== (profile?.display_name || "") ||
    avatarUrl !== (profile?.avatar_url || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar
                src={avatarUrl}
                alt={displayName || user.email || "User"}
                size="xl"
                fallbackText={displayName || user.email}
              />

              {/* Upload button */}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-full cursor-pointer transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>

              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading || saving}
              />
            </div>

            {/* Delete avatar button */}
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAvatar}
                disabled={deleting || uploading || saving}
                className="text-red-600 hover:text-red-700"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove Avatar
              </Button>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              disabled={saving}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {displayName.length}/50 characters
            </p>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
