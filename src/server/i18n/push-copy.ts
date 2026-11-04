import "server-only";
import { isLocale, type Locale } from "@/i18n/config";

/**
 * Push / email copy per recipient language. Recipients without a stored
 * choice get Turkish (the first market); the web UI itself falls back to
 * the browser language instead.
 */
export const RECIPIENT_FALLBACK_LOCALE: Locale = "tr";

export function recipientLocale(value: unknown): Locale {
  return isLocale(value) ? value : RECIPIENT_FALLBACK_LOCALE;
}

const someone = (l: Locale) => (l === "tr" ? "Birisi" : "Someone");

/** "Mert" / "Mert ve 2 kişi daha" / "Mert and 2 others" */
function actors(l: Locale, name: string | null, count: number): string {
  const who = name || someone(l);
  const others = count - 1;
  if (others <= 0) return who;
  if (l === "tr") return `${who} ve ${others} kişi daha`;
  return `${who} and ${others} ${others === 1 ? "other" : "others"}`;
}

export const pushCopy = {
  someone,

  commentLiked: (l: Locale, name: string | null, count: number) =>
    l === "tr"
      ? `${actors(l, name, count)} yorumunu beğendi`
      : `${actors(l, name, count)} liked your comment`,

  followedUserPin: (l: Locale, name: string | null) =>
    l === "tr" ? `${name || someone(l)} yeni bir pin bıraktı` : `${name || someone(l)} dropped a new pin`,

  /** To the pin owner. */
  pinCommentedOwner: (l: Locale, name: string | null, count: number) =>
    l === "tr"
      ? `${actors(l, name, count)} pinine yorum yaptı`
      : `${actors(l, name, count)} shared ${count > 1 ? "opinions" : "an opinion"} on your pin`,

  /** To earlier commenters. */
  pinCommentedOthers: (l: Locale, pinName: string) =>
    l === "tr" ? `“${pinName}” hakkında yeni yorum` : `New opinion on “${pinName}”`,

  followed: (l: Locale, name: string | null) =>
    l === "tr"
      ? {
          title: `${name || someone(l)} seni takip etmeye başladı`,
          body: "Profiline göz at ve yeni pinlerini paylaş.",
        }
      : {
          title: `${name || someone(l)} started following you`,
          body: "Check out your profile and share new pins.",
        },
};
