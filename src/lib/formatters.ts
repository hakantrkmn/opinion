const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

function getLocale() {
  if (typeof navigator !== "undefined") {
    return navigator.languages?.[0] || navigator.language || "en";
  }

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
