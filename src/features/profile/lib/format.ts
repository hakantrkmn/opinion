/**
 * Formatting for the account pages. Pass the UI locale (`useLocale()`), so
 * numbers and dates match the language of the surrounding copy.
 */
const compactCache = new Map<string, Intl.NumberFormat>();
const monthYearCache = new Map<string, Intl.DateTimeFormat>();

function compact(locale: string) {
  let formatter = compactCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    compactCache.set(locale, formatter);
  }
  return formatter;
}

function monthYear(locale: string) {
  let formatter = monthYearCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
    monthYearCache.set(locale, formatter);
  }
  return formatter;
}

export function formatCount(value: number | null | undefined, locale = "en"): string {
  const n = value ?? 0;
  return Math.abs(n) < 1000 ? String(n) : compact(locale).format(n);
}

export function formatSignedCount(value: number, locale = "en"): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCount(Math.abs(value), locale)}`;
}

/** "Nov 2026" in the given locale, or null when the date is unknown. */
export function formatJoined(value: string | Date | null | undefined, locale = "en"): string | null {
  if (!value) return null;
  return monthYear(locale).format(typeof value === "string" ? new Date(value) : value);
}
