"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNITY_DESCRIPTION_MAX_LENGTH,
  COMMUNITY_NAME_MAX_LENGTH,
} from "@/constants/limits";
import type { CommunityResponse } from "@/types/api";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface CommunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing community; creating when omitted. */
  initial?: { name: string; description: string | null };
  pending: boolean;
  onSubmit: (values: { name: string; description: string | null }) => Promise<CommunityResponse>;
}

/** Name + optional description, for creating and editing a community. */
export function CommunityFormDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: CommunityFormDialogProps) {
  const t = useTranslations("communities.form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [open, initial?.name, initial?.description]);

  const trimmed = name.trim();
  const unchanged =
    editing && trimmed === initial.name && description.trim() === (initial.description ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !trimmed || unchanged) return;
    try {
      await onSubmit({ name: trimmed, description: description.trim() || null });
      onOpenChange(false);
    } catch {
      // The caller shows the error toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("editDescription") : t("createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="community-name">{t("nameLabel")}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {name.length}/{COMMUNITY_NAME_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={COMMUNITY_NAME_MAX_LENGTH}
              placeholder={t("namePlaceholder")}
              autoComplete="off"
              required
              autoFocus
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="community-description">
                {t("descriptionLabel")}{" "}
                <span className="font-normal text-muted-foreground">{t("optional")}</span>
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {description.length}/{COMMUNITY_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="community-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={COMMUNITY_DESCRIPTION_MAX_LENGTH}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl"
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !trimmed || unchanged} className="h-10 rounded-xl">
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {editing ? (pending ? t("saving") : t("save")) : pending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
