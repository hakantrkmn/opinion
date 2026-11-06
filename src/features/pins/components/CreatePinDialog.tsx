"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { COMMUNITY_COLORS } from "@/constants/community-colors";
import {
  COMMENT_MAX_LENGTH,
  PIN_CREATE_MAX_DISTANCE_M,
  PIN_NAME_MAX_LENGTH,
} from "@/constants";
import { useMyCommunities } from "@/features/communities/hooks/use-communities";
import { useGeoErrorMessage } from "@/features/map/hooks/useGeoErrorMessage";
import { getQuickFix } from "@/features/map/lib/geolocation";
import { useLocationStore } from "@/features/map/store/location-store";
import { useMapUiStore, type DraftPin } from "@/features/map/store/ui-store";
import { PhotoPicker } from "@/features/media/components/PhotoPicker";
import { useObjectUrl } from "@/features/media/hooks/useObjectUrl";
import { ApiError, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { CommunitySummary } from "@/types/api";
import { AlertCircle, Crosshair, Globe, Loader2, Lock, MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCreatePin } from "../hooks/useCreatePin";

export function CreatePinDialog({
  defaultCommunityId = null,
}: {
  /** The map's community filter: new pins start out for that community. */
  defaultCommunityId?: string | null;
}) {
  const t = useTranslations("pins.create");
  const draft = useMapUiStore((s) => s.draft);
  const setDraft = useMapUiStore((s) => s.setDraft);

  // Keep the last draft while animating out; fresh form state per opening.
  const [shown, setShown] = useState(draft);
  const [prevDraft, setPrevDraft] = useState(draft);
  const [session, setSession] = useState(0);
  if (draft !== prevDraft) {
    if (draft && !prevDraft) setSession((n) => n + 1);
    if (draft) setShown(draft);
    setPrevDraft(draft);
  }

  return (
    <ResponsiveDialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[92dvh] overflow-y-auto overscroll-contain"
        desktopClassName="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ResponsiveDialogPanel
          title={
            <span className="flex items-center gap-2.5 text-lg font-bold">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
                <PinIcon className="size-[18px] text-white" />
              </span>
              {t("title")}
            </span>
          }
          description={t("description")}
        >
          {shown ? (
            <CreatePinForm
              key={session}
              draft={draft ?? shown}
              defaultCommunityId={defaultCommunityId}
              onDone={() => setDraft(null)}
            />
          ) : null}
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function CreatePinForm({
  draft,
  defaultCommunityId,
  onDone,
}: {
  draft: DraftPin;
  defaultCommunityId: string | null;
  onDone: () => void;
}) {
  const t = useTranslations("pins.create");
  const geoErrorMessage = useGeoErrorMessage();
  const setDraft = useMapUiStore((s) => s.setDraft);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrl = useObjectUrl(photo);
  const create = useCreatePin();
  const communities = useMyCommunities();
  const [visibility, setVisibility] = useState(defaultCommunityId);
  const community = communities.data?.find((c) => c.id === visibility) ?? null;
  // What the picker shows is what gets sent. Until the list loads, keep the
  // preset community: never fall back to public silently.
  const communityId = communities.data ? (community?.id ?? null) : visibility;

  const tooFar = create.error instanceof ApiError && create.error.code === "TOO_FAR";
  const tooFarIssues = (tooFar ? (create.error as ApiError).issues : null) as {
    distance_m?: number;
    max_distance_m?: number;
  } | null;
  // 404 for a community pin: no longer a member (the list refreshes).
  const communityGone =
    !!create.variables?.communityId &&
    create.error instanceof ApiError &&
    create.error.status === 404;
  const pending = create.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!name.trim() || !comment.trim()) {
      setShowErrors(true);
      // Focus the first field that needs attention.
      const first = !name.trim() ? "name" : "comment";
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        comment: comment.trim(),
        lat: draft.lat,
        lng: draft.lng,
        userLat: draft.fix.lat,
        userLng: draft.fix.lng,
        accuracy: draft.fix.accuracy,
        photo,
        communityId,
      },
      { onSuccess: onDone }
    );
  };

  /** Gets a new GPS fix; a pin placed at the old fix follows the new one. */
  const refreshLocation = async () => {
    setRefreshing(true);
    try {
      const fix = await getQuickFix({ maxAgeMs: 0 });
      useLocationStore.getState().setFix(fix);
      const atFix = draft.lng === draft.fix.lng && draft.lat === draft.fix.lat;
      setDraft(atFix ? { lng: fix.lng, lat: fix.lat, fix } : { ...draft, fix });
      create.reset();
    } catch (error) {
      useLocationStore.getState().setLocating(false);
      create.reset();
      toast.error(t("locationFailed"), { description: geoErrorMessage(error) });
    } finally {
      setRefreshing(false);
    }
  };

  const accuracy = Math.round(draft.fix.accuracy);
  const quality = accuracy <= 25 ? "good" : accuracy <= 75 ? "fair" : "poor";

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6"
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 py-1.5 pl-3 pr-1.5 text-xs">
        <span className="relative flex size-2.5 shrink-0" aria-hidden>
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              quality === "good" ? "bg-emerald-500" : quality === "fair" ? "bg-amber-500" : "bg-red-500"
            )}
          />
        </span>
        <span className="min-w-0 flex-1 text-muted-foreground">
          <span className="font-medium text-foreground">{t("atYourLocation")}</span>
          <span className="tabular-nums"> · ±{accuracy} m</span>
          {quality === "poor" ? <span> · {t("weakSignal")}</span> : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={refreshLocation}
          disabled={refreshing || pending}
          aria-label={t("refreshLocation")}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Crosshair className="size-3.5" />
          )}
          {refreshing ? t("locating") : t("refresh")}
        </Button>
      </div>

      <Field
        id="pin-name"
        label={t("nameLabel")}
        error={showErrors && !name.trim() ? t("nameRequired") : null}
        count={name.length}
        max={PIN_NAME_MAX_LENGTH}
      >
        <Input
          id="pin-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
          maxLength={PIN_NAME_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="next"
          aria-invalid={showErrors && !name.trim() ? true : undefined}
          aria-describedby={showErrors && !name.trim() ? "pin-name-error" : undefined}
          disabled={pending}
          className="h-11 rounded-xl text-base sm:text-sm"
        />
      </Field>

      <Field
        id="pin-comment"
        label={t("commentLabel")}
        error={showErrors && !comment.trim() ? t("commentRequired") : null}
        count={comment.length}
        max={COMMENT_MAX_LENGTH}
      >
        <Textarea
          id="pin-comment"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          rows={3}
          required
          maxLength={COMMENT_MAX_LENGTH}
          aria-invalid={showErrors && !comment.trim() ? true : undefined}
          aria-describedby={showErrors && !comment.trim() ? "pin-comment-error" : undefined}
          disabled={pending}
          className="min-h-24 resize-none rounded-xl text-base sm:text-sm"
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          {t.rich("photoLabel", {
            muted: (chunks) => <span className="font-normal text-muted-foreground">{chunks}</span>,
          })}
        </span>
        {previewUrl ? (
          <div className="relative w-fit">
            <img
              src={previewUrl}
              alt={t("selectedPhoto")}
              width={128}
              height={96}
              className="aspect-[4/3] w-32 rounded-xl border border-border/50 object-cover"
            />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform duration-150 ease-out active:scale-[0.94] pointer-coarse:size-8"
              aria-label={t("removePhoto")}
              disabled={pending}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <PhotoPicker onPick={setPhoto} disabled={pending} />
        )}
      </div>

      {communities.data?.length ? (
        <VisibilityPicker
          communities={communities.data}
          value={community?.id ?? null}
          onChange={(id) => {
            setVisibility(id);
            if (communityGone) create.reset();
          }}
          disabled={pending}
        />
      ) : null}

      {create.isError ? (
        <div
          role="alert"
          className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex flex-col gap-2">
            <p className="font-medium text-destructive">
              {tooFar ? t("tooFarTitle") : t("failedTitle")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tooFar
                ? t("tooFarBody", {
                    hasDistance: typeof tooFarIssues?.distance_m === "number" ? "yes" : "no",
                    // Strings, so numbers render exactly as before (no grouping).
                    distance: String(Math.round(tooFarIssues?.distance_m ?? 0)),
                    max: String(tooFarIssues?.max_distance_m ?? PIN_CREATE_MAX_DISTANCE_M),
                  })
                : communityGone
                  ? t("communityGone")
                  : errorMessage(create.error, t("tryAgain"))}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          onClick={onDone}
          disabled={pending}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          {pending ? t("dropping") : t("drop")}
        </Button>
      </div>
    </form>
  );
}

/**
 * "Who can see it?": Everyone or one of the viewer's communities. Fixed once
 * the pin is dropped, so the choice is spelled out under the chips.
 */
function VisibilityPicker({
  communities,
  value,
  onChange,
  disabled,
}: {
  communities: CommunitySummary[];
  /** Selected community id, null for everyone. */
  value: string | null;
  onChange: (communityId: string | null) => void;
  disabled: boolean;
}) {
  const t = useTranslations("pins.create");
  const options = [{ id: null, name: t("visibilityEveryone") }, ...communities];
  const selected = communities.find((c) => c.id === value);
  return (
    <div className="flex flex-col gap-1.5">
      <span id="pin-visibility-label" className="text-sm font-medium">
        {t("visibilityLabel")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="pin-visibility-label"
        aria-describedby="pin-visibility-hint"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {options.map((o) => {
          const active = o.id === value;
          const Icon = o.id ? Lock : Globe;
          const color = "color" in o ? COMMUNITY_COLORS[o.color] : undefined;
          return (
            <button
              key={o.id ?? "everyone"}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={cn(
                "flex h-9 max-w-48 shrink-0 select-none items-center gap-1.5 rounded-full border px-3 text-xs font-medium touch-manipulation transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" style={{ color }} />
              <span className="truncate">{o.name}</span>
            </button>
          );
        })}
      </div>
      <p id="pin-visibility-hint" className="text-xs text-muted-foreground">
        {selected
          ? t("visibilityCommunityHint", { name: selected.name })
          : t("visibilityPublicHint")}
      </p>
    </div>
  );
}

/** Label + control + inline error / character count. */
function Field({
  id,
  label,
  error,
  count,
  max,
  children,
}: {
  id: string;
  label: string;
  error: string | null;
  count: number;
  max: number;
  children: React.ReactNode;
}) {
  const nearLimit = count >= max * 0.8;
  return (
    <div className="flex flex-col gap-1.5" data-invalid={error ? true : undefined}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error || nearLimit ? (
        <div className="flex items-start justify-between gap-3 text-xs">
          {error ? (
            <p id={`${id}-error`} className="text-destructive">
              {error}
            </p>
          ) : (
            <span />
          )}
          {nearLimit ? (
            <span className={cn("tabular-nums text-muted-foreground", count >= max && "text-destructive")}>
              {count}/{max}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
