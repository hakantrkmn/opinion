"use client";

import { Button } from "@/components/ui/button";
import { Copy, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteUrl } from "../lib/links";

/** Founder-only: the invite link with copy / share. */
export function InviteLinkCard({ code, communityName }: { code: string; communityName: string }) {
  const t = useTranslations("communities.invite");
  // window.location is client-only; render the path until mounted.
  const [url, setUrl] = useState(`/c/${code}`);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setUrl(inviteUrl(code));
    setCanShare(typeof navigator.share === "function");
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"), { id: "copy-invite" });
    } catch {
      toast.info(t("copyFailed"), { id: "copy-invite", description: url });
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: communityName, text: t("shareText", { name: communityName }), url });
    } catch {
      // Dismissed by the user.
    }
  };

  return (
    <section
      aria-labelledby="invite-title"
      className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Link2 aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="invite-title" className="text-sm font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label={t("linkLabel")}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 font-mono text-[13px] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-1"
        />
        <div className="flex gap-2">
          <Button onClick={() => void copy()} className="h-11 flex-1 rounded-xl sm:flex-none">
            <Copy aria-hidden />
            {t("copy")}
          </Button>
          {canShare ? (
            <Button
              variant="outline"
              onClick={() => void share()}
              className="h-11 flex-1 rounded-xl sm:flex-none"
            >
              <Share2 aria-hidden />
              {t("share")}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
