const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Locale-aware formatting. Pass the UI locale (`useLocale()` in client
 * components, `getLocale()` on the server) so SSR and the browser format
 * identically; it defaults to English.
 */
function getDateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dateFormatterCache.get(key)!;
}

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions) {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!numberFormatterCache.has(key)) {
    numberFormatterCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatterCache.get(key)!;
}

export function formatShortDate(value: string | Date, locale = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return getDateFormatter(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRelativeDateTime(value: string | Date, locale = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return getDateFormatter(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCompactNumber(value: number, locale = "en") {
  return getNumberFormatter(locale, {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

/** "650 m", "2.4 km", "183 km". */
export function formatDistance(meters: number, locale = "en") {
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) return `${Math.max(10, rounded)} m`;
  const km = meters / 1000;
  return `${getNumberFormatter(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

const relativeFormatterCache = new Map<string, Intl.RelativeTimeFormat>();

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.345],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

/** Intl says "now"; "just now" reads better next to "edited", "joined". */
const JUST_NOW: Record<string, string> = { en: "just now", tr: "az önce" };

/** "3 hours ago", "yesterday", "just now"… in the given locale. */
export function formatTimeAgo(value: string | Date, locale = "en", now = Date.now()) {
  const date = typeof value === "string" ? new Date(value) : value;
  let delta = (date.getTime() - now) / 1000;

  let formatter = relativeFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeFormatterCache.set(locale, formatter);
  }
  if (Math.abs(delta) < 45) return JUST_NOW[locale] ?? formatter.format(0, "second");
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return formatter.format(Math.round(delta), unit);
    delta /= size;
  }
  return formatShortDate(date, locale);
}
