import type { StyleSpecification } from "maplibre-gl";

/**
 * OpenFreeMap's styles compare optional tile attributes directly, e.g.
 * `[">=", ["get", "rank"], 3]`. Features without that attribute make MapLibre
 * log "Expected value to be of type number, but found null instead." (once
 * per worker). Wrapping the lookup in a `coalesce` with a sentinel that makes
 * the comparison false keeps the original result (the feature was already
 * dropped on the error) without the warning.
 */
const LOW = -1e9;
const HIGH = 1e9;
const OPS = new Set(["<", "<=", ">", ">="]);

type Expr = unknown;

const isGet = (e: Expr): e is ["get", string] =>
  Array.isArray(e) && e[0] === "get" && e.length === 2 && typeof e[1] === "string";

function fix(e: Expr): Expr {
  if (!Array.isArray(e)) return e;
  const out = e.map(fix);
  const [op, lhs, rhs] = out;
  if (typeof op === "string" && OPS.has(op) && out.length === 3) {
    // `get < n` / `get <= n` must be false for missing → HIGH; `>`/`>=` → LOW.
    const lowIsFalse = op === ">" || op === ">=";
    if (isGet(lhs) && typeof rhs === "number") {
      out[1] = ["coalesce", lhs, lowIsFalse ? LOW : HIGH];
    } else if (isGet(rhs) && typeof lhs === "number") {
      // n < get  ⇔  get > n
      out[2] = ["coalesce", rhs, lowIsFalse ? HIGH : LOW];
    }
  }
  return out;
}

function fixObject<T extends Record<string, unknown> | undefined>(obj: T): T {
  if (!obj) return obj;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) next[key] = fix(value);
  return next as T;
}

/** `transformStyle` hook for `map.setStyle`. */
export function sanitizeStyle(
  _previous: StyleSpecification | undefined,
  next: StyleSpecification
): StyleSpecification {
  return {
    ...next,
    layers: next.layers.map((layer) => {
      const l = { ...layer } as typeof layer & {
        filter?: unknown;
        layout?: Record<string, unknown>;
        paint?: Record<string, unknown>;
      };
      if (l.filter) l.filter = fix(l.filter);
      if (l.layout) l.layout = fixObject(l.layout);
      if (l.paint) l.paint = fixObject(l.paint);
      return l as typeof layer;
    }),
  };
}
