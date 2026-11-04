/**
 * Visitors' unsent pin-page opinions (see PinPageComposer). The draft is
 * kept in localStorage while they sign up; a one-shot marker in this tab's
 * sessionStorage says "post it when I'm back from /auth". Without the
 * marker a draft is only offered back, never posted.
 */
const DRAFT_PREFIX = "dropinion:pin-draft:";
const RESUME_PREFIX = "dropinion:pin-resume:";
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // storage blocked
  }
}

export function readDraft(pinId: string): string | null {
  return safe(() => {
    const raw = localStorage.getItem(DRAFT_PREFIX + pinId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof draft.text !== "string" || typeof draft.at !== "number") return null;
    if (Date.now() - draft.at > DRAFT_TTL_MS) return null;
    return draft.text;
  }, null);
}

/** Saves the draft and arms the auto-post for this tab's return from /auth. */
export function saveDraftForSignIn(pinId: string, text: string) {
  safe(() => {
    localStorage.setItem(DRAFT_PREFIX + pinId, JSON.stringify({ text, at: Date.now() }));
    sessionStorage.setItem(RESUME_PREFIX + pinId, "1");
  }, undefined);
}

/** True once per armed return (consumes the marker). */
export function takeResume(pinId: string): boolean {
  return safe(() => {
    const armed = sessionStorage.getItem(RESUME_PREFIX + pinId) === "1";
    sessionStorage.removeItem(RESUME_PREFIX + pinId);
    return armed;
  }, false);
}

export function clearDraft(pinId: string) {
  safe(() => localStorage.removeItem(DRAFT_PREFIX + pinId), undefined);
}

/** On sign-out: drafts must not follow the browser to the next account. */
export function clearAllDrafts() {
  safe(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(DRAFT_PREFIX)) localStorage.removeItem(key);
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(RESUME_PREFIX)) sessionStorage.removeItem(key);
    }
  }, undefined);
}
