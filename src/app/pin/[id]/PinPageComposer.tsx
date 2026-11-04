"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/constants/limits";
import { useSession } from "@/features/auth/hooks/useSession";
import { fetchPinComments, postComment } from "@/features/comments/lib/api";
import { errorMessage } from "@/lib/api/client";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** A visitor's unsent opinion survives the trip through sign-up. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const draftKey = (pinId: string) => `dropinion:pin-draft:${pinId}`;

function readDraft(pinId: string): string | null {
  try {
    const raw = localStorage.getItem(draftKey(pinId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof draft.text !== "string" || typeof draft.at !== "number") return null;
    if (Date.now() - draft.at > DRAFT_TTL_MS) return null;
    return draft.text;
  } catch {
    return null;
  }
}

function writeDraft(pinId: string, text: string) {
  try {
    localStorage.setItem(draftKey(pinId), JSON.stringify({ text, at: Date.now() }));
  } catch {
    // storage blocked: the visitor retypes after signing in
  }
}

/**
 * "Opinion #n" survives the router.refresh() that follows a post (the
 * form may remount and would otherwise only see "already commented").
 */
const postedKey = (pinId: string) => `dropinion:pin-posted:${pinId}`;

function takePosted(pinId: string): number | null {
  try {
    const raw = sessionStorage.getItem(postedKey(pinId));
    sessionStorage.removeItem(postedKey(pinId));
    const n = Number(raw);
    return raw && Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function rememberPosted(pinId: string, position: number) {
  try {
    sessionStorage.setItem(postedKey(pinId), String(position));
  } catch {
    // ignore
  }
}

function clearDraft(pinId: string) {
  try {
    localStorage.removeItem(draftKey(pinId));
  } catch {
    // ignore
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "posting" }
  | { kind: "posted"; position: number }
  | { kind: "already" }
  | { kind: "error"; message: string };

/**
 * "What do you think?" on the shareable pin page. Signed-in users post
 * right here. Visitors can write first: the draft is kept in this browser,
 * they sign up (or in), come back here and it is posted automatically.
 */
export function PinPageComposer({
  pinId,
  pinName,
  commentsCount,
}: {
  pinId: string;
  pinName: string;
  commentsCount: number;
}) {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const resumed = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;
  const trimmed = text.trim();
  const returnTo = `/pin/${encodeURIComponent(pinId)}#your-opinion`;

  const submit = async (value: string) => {
    setStatus({ kind: "posting" });
    try {
      await postComment(pinId, { text: value });
      clearDraft(pinId);
      setText("");
      const position = commentsCount + 1;
      rememberPosted(pinId, position);
      setStatus({ kind: "posted", position });
      router.refresh();
    } catch (error) {
      // 409: they already shared an opinion here (e.g. from the map).
      const status = (error as { status?: number }).status;
      if (status === 409) {
        clearDraft(pinId);
        setStatus({ kind: "already" });
      } else {
        setStatus({ kind: "error", message: errorMessage(error) });
      }
    }
  };

  // Back from sign-up / sign-in with a draft: post it once. Keyed on the
  // user id: the session object is re-created on refetch.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (isLoading || resumed.current) return;
    const draft = readDraft(pinId);
    if (!userId) {
      if (draft) setText(draft);
      return;
    }
    resumed.current = true;
    void fetchPinComments(pinId, "newest", 0)
      .then((page) => {
        // The user may have posted meanwhile: only act while still idle.
        if (statusRef.current.kind !== "idle") return;
        if (page.my_comment_id) {
          clearDraft(pinId);
          const position = takePosted(pinId);
          setStatus(position ? { kind: "posted", position } : { kind: "already" });
        } else if (draft) {
          setText(draft);
          void submit(draft);
        }
      })
      .catch(() => {
        if (draft) setText(draft);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per signed-in user
  }, [isLoading, userId, pinId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Until the session is known we can't tell visitors from members.
    if (!trimmed || status.kind === "posting" || isLoading) return;
    if (!user) {
      writeDraft(pinId, trimmed);
      router.push(`/auth?mode=signup&redirect=${encodeURIComponent(returnTo)}`);
      return;
    }
    void submit(trimmed);
  };

  if (status.kind === "posted" || status.kind === "already") {
    return (
      <div
        id="your-opinion"
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            {status.kind === "posted"
              ? status.position <= 1
                ? "You're the first opinion here!"
                : `Yours is opinion #${status.position} here.`
              : "You've shared your opinion on this place."}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            We&apos;ll let you know when someone answers.{" "}
            <Link href={`/?pin=${encodeURIComponent(pinId)}`} className="font-medium text-primary hover:underline">
              See it on the map
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const posting = status.kind === "posting";
  return (
    <form
      id="your-opinion"
      onSubmit={onSubmit}
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-card p-4"
    >
      <label htmlFor="pin-page-opinion" className="text-sm font-semibold text-foreground">
        What do you think about {pinName}?
      </label>
      <Textarea
        id="pin-page-opinion"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your honest take…"
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        disabled={posting}
        className="mt-2 min-h-20 resize-none rounded-xl text-base sm:text-sm"
      />
      {status.kind === "error" ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {status.message}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {user || isLoading
            ? "Posted publicly with your name."
            : "Free account needed. Your text is kept while you sign up."}
        </p>
        <Button type="submit" disabled={!trimmed || posting || isLoading} className="h-10 gap-2 rounded-xl px-4">
          {posting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {posting ? "Posting…" : user || isLoading ? "Post opinion" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
