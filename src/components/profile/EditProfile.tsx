"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[92dvh] overflow-y-auto"
        desktopClassName="max-w-md"
      >
        <ResponsiveDialogPanel
          title="Edit Profile"
          description="Update your profile information"
        >
        <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-foreground/5 blur-sm group-hover:bg-foreground/8 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                <Avatar
                  src={avatarUrl}
                  alt={displayName || user.email || "User"}
                  size="xl"
                  fallbackText={displayName || user.email}
                />

                {/* Upload button */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-foreground hover:bg-foreground/90 text-background rounded-full cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.93] flex items-center justify-center shadow-md hover:shadow-lg"
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
                  className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] cursor-pointer disabled:opacity-40 flex items-center gap-1"
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
                placeholder="Your name"
                disabled={saving}
                maxLength={50}
                className="h-11 rounded-xl"
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
                className="flex-1 h-11 rounded-xl font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex-1 h-11 rounded-xl font-medium shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
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
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
