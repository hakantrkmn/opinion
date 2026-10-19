const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * The UI copy is English, and server and client must format identically to
 * avoid hydration mismatches, so formatting is pinned to "en".
 */
function getLocale() {
  return "en";
}

function getDateFormatter(options: Intl.DateTimeFormatOptions) {
  const locale = getLocale();
  const key = `${locale}:${JSON.stringify(options)}`;

  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, new Intl.DateTimeFormat(locale, options));
  }

  return dateFormatterCache.get(key)!;
}

function getNumberFormatter(options: Intl.NumberFormatOptions) {
  const locale = getLocale();
  const key = `${locale}:${JSON.stringify(options)}`;

  if (!numberFormatterCache.has(key)) {
    numberFormatterCache.set(key, new Intl.NumberFormat(locale, options));
  }

  return numberFormatterCache.get(key)!;
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return getDateFormatter({
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRelativeDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return getDateFormatter({
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCompactNumber(value: number) {
  return getNumberFormatter({
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
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

/** "3 hours ago", "yesterday"… (English, like the rest of the UI). */
export function formatTimeAgo(value: string | Date, now = Date.now()) {
  const date = typeof value === "string" ? new Date(value) : value;
  let delta = (date.getTime() - now) / 1000;
  if (Math.abs(delta) < 45) return "just now";

  const locale = "en";
  let formatter = relativeFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeFormatterCache.set(locale, formatter);
  }
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return formatter.format(Math.round(delta), unit);
    delta /= size;
  }
  return formatShortDate(date);
}
