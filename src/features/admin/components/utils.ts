import { formatShortDate } from "@/lib/formatters";

/** Pass the UI locale (`useLocale()`). */
export function formatNumber(n: number | undefined, locale: string): string {
  return typeof n === "number" ? n.toLocaleString(locale) : "—";
}

export function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  return formatShortDate(iso, locale);
}

export function initials(value?: string): string {
  return (value || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
