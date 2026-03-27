"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useUploadAvatar,
  useDeleteAvatar,
  useUpdateDisplayName,
} from "@/hooks/mutations/use-profile-mutations";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditProfileProps {
  user: { id: string; email: string; name?: string };
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
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();
  const updateNameMutation = useUpdateDisplayName();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const uploading = uploadAvatarMutation.isPending;
  const deleting = deleteAvatarMutation.isPending;
  const saving = updateNameMutation.isPending;

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadAvatarMutation.mutate(file, {
      onSuccess: (data) => {
        setAvatarUrl(data.url);
      },
    });
    event.target.value = "";
  };

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate(undefined, {
      onSuccess: () => {
        setAvatarUrl("");
      },
    });
  };

  const handleSave = () => {
    const currentDisplayName = profile?.display_name || "";

    if (displayName.trim() !== currentDisplayName) {
      updateNameMutation.mutate(displayName.trim(), {
        onSuccess: () => {
          onProfileUpdate({
            display_name: displayName,
            avatar_url: avatarUrl || null,
          });
          toast.success("Profile updated!");
          onClose();
        },
      });
    } else {
      onProfileUpdate({
        display_name: displayName,
        avatar_url: avatarUrl || null,
      });
      toast.success("Profile updated!");
      onClose();
    }
  };

  const hasChanges =
    displayName.trim() !== (profile?.display_name || "") ||
    avatarUrl !== (profile?.avatar_url || "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />

        <div className="p-6">
          <DialogHeader className="space-y-0 mb-6">
            <DialogTitle className="text-lg font-bold">Edit Profile</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 opacity-15 blur-sm group-hover:opacity-25 transition-opacity" />
                <Avatar
                  src={avatarUrl}
                  alt={displayName || user.email || "User"}
                  size="xl"
                  fallbackText={displayName || user.email}
                />

                {/* Upload button */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-full cursor-pointer transition-all flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
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
                <button
                  onClick={handleDeleteAvatar}
                  disabled={deleting || uploading || saving}
                  className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  {deleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Remove avatar
                </button>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                disabled={saving}
                maxLength={50}
                className="h-11 rounded-xl border-border/60 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-colors"
              />
              <p className="text-[11px] text-muted-foreground/50 text-right tabular-nums">
                {displayName.length}/50
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                value={user.email || ""}
                disabled
                className="h-11 rounded-xl bg-muted/30 text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground/50">
                Email cannot be changed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1 h-11 rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex-1 h-11 rounded-xl font-medium bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 border-none text-white shadow-md disabled:opacity-40 disabled:shadow-none transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
