import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { getPinPageData, getPinShareQuote } from "@/server/services/pins/pages";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const BRAND = "#0f8a62";
const INK = "#0b1f18";

function clip(value: string, max: number) {
  const v = value.replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/og/pin/:id → 1200×630 link preview with the pin's best opinion
 * quoted. Content comes from the database only (nothing from the query
 * string); a missing pin gets the neutral brand card.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = enforceRateLimit(request, "og", RATE_LIMITS.og);
  if (rl) return rl;

  const { id } = await params;
  const valid = /^[\w-]{1,64}$/.test(id);
  const [pin, quote] = valid
    ? await Promise.all([getPinPageData(id), getPinShareQuote(id)])
    : [null, null];

  const count = pin?.commentsCount ?? 0;
  const footer = pin
    ? `${count} ${count === 1 ? "opinion" : "opinions"} · What do you think?`
    : "Drop a pin. Share what you think.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `linear-gradient(140deg, ${INK} 0%, #10372b 55%, ${BRAND} 140%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            📍
          </div>
          <div style={{ fontSize: 30, letterSpacing: -0.5 }}>droPINion</div>
          {pin ? (
            <div style={{ marginLeft: "auto", fontSize: 26, color: "#9be7c8", display: "flex" }}>
              {clip(pin.name, 48)}
            </div>
          ) : null}
        </div>

        {quote ? (
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div
              style={{
                display: "flex",
                width: "100%",
                fontSize: quote.text.length > 110 ? 46 : 56,
                lineHeight: 1.18,
              }}
            >
              “{clip(quote.text, 170)}”
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 28,
                fontSize: 28,
                color: "#cdeee0",
              }}
            >
              <span>— {clip(quote.displayName, 40)}</span>
              {quote.verifiedVisit ? (
                <span
                  style={{
                    display: "flex",
                    marginLeft: 14,
                    fontSize: 22,
                    padding: "4px 14px",
                    borderRadius: 999,
                    background: "rgba(16, 185, 129, 0.22)",
                    color: "#7ff0c3",
                  }}
                >
                  Was here
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", width: "100%", fontSize: 60, lineHeight: 1.15 }}>
            {pin ? clip(pin.name, 80) : "Honest opinions, pinned to real places."}
          </div>
        )}

        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              padding: "12px 24px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.12)",
              color: "white",
            }}
          >
            {footer}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // New opinions change the quote: keep it reasonably fresh.
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    }
  );
}
