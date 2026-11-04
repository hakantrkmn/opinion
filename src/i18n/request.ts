import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./config";
import { loadMessages } from "./messages";

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  return {
    locale,
    messages: await loadMessages(locale),
    // Server and browser must agree when formatting dates during SSR.
    timeZone: "Europe/Istanbul",
  };
});
