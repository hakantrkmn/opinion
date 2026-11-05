import type { Locale } from "./config";
import type { Messages } from "./messages-en";

/**
 * Messages are split per feature (messages/<locale>/<namespace>.json) so
 * features can be translated independently. Keys are typed from English;
 * a unit test checks that every locale has exactly the same keys.
 */
export const NAMESPACES = ["common", "header", "map", "pins", "comments", "media", "moderation", "notifications", "profile", "users", "auth", "admin", "pages", "communities"] as const;

export async function loadMessages(locale: Locale): Promise<Messages> {
  return {
    common: (await import(`../../messages/${locale}/common.json`)).default,
    header: (await import(`../../messages/${locale}/header.json`)).default,
    map: (await import(`../../messages/${locale}/map.json`)).default,
    pins: (await import(`../../messages/${locale}/pins.json`)).default,
    comments: (await import(`../../messages/${locale}/comments.json`)).default,
    media: (await import(`../../messages/${locale}/media.json`)).default,
    moderation: (await import(`../../messages/${locale}/moderation.json`)).default,
    notifications: (await import(`../../messages/${locale}/notifications.json`)).default,
    profile: (await import(`../../messages/${locale}/profile.json`)).default,
    users: (await import(`../../messages/${locale}/users.json`)).default,
    auth: (await import(`../../messages/${locale}/auth.json`)).default,
    admin: (await import(`../../messages/${locale}/admin.json`)).default,
    pages: (await import(`../../messages/${locale}/pages.json`)).default,
    communities: (await import(`../../messages/${locale}/communities.json`)).default,
  } as Messages;
}
