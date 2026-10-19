/**
 * English-only formatting for the account pages, matching the UI copy (and
 * the map, which uses formatTimeAgo). The shared formatters in
 * lib/formatters follow the browser locale, which mixes languages.
 */
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthYear = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

export function formatCount(value: number | null | undefined): string {
  const n = value ?? 0;
  return Math.abs(n) < 1000 ? String(n) : compact.format(n);
}

export function formatSignedCount(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCount(Math.abs(value))}`;
}

export function formatJoined(value: string | Date | null | undefined): string {
  if (!value) return "recently";
  return monthYear.format(typeof value === "string" ? new Date(value) : value);
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
