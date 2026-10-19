export function formatNumber(n?: number): string {
  return typeof n === "number" ? n.toLocaleString("en-US") : "—";
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function initials(value?: string): string {
  return (value || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
