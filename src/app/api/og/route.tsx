import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";

export const runtime = "nodejs";

function clamp(value: string | null, max: number): string | null {
  if (!value) return null;
  const v = value.trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export async function GET(request: NextRequest) {
  // Image rendering is CPU-heavy: limit per client IP.
  const rl = enforceRateLimit(request, "og", RATE_LIMITS.og);
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);

    const title = clamp(searchParams.get("title"), 80) || "droPINion";
    const description =
      clamp(searchParams.get("description"), 160) ||
      "Share your thoughts on the map";
    const location = clamp(searchParams.get("location"), 60);
    const rawType = searchParams.get("type");
    const type =
      rawType === "pin" || rawType === "location" ? rawType : "default";

    // Define colors and styling
    const backgroundColor =
      type === "pin" ? "#3B82F6" : type === "location" ? "#10B981" : "#6366F1";
    const accentColor = "#FFFFFF";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: backgroundColor,
            backgroundImage: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}dd 100%)`,
            padding: "40px",
            fontFamily: '"Inter", "system-ui", "sans-serif"',
          }}
        >
          {/* Logo/Brand Area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
              color: accentColor,
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "20px",
                fontSize: "24px",
                fontWeight: "bold",
                color: backgroundColor,
              }}
            >
              📍
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
              }}
            >
              droPINion
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            <h1
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: accentColor,
                marginBottom: "20px",
                lineHeight: "1.1",
                textAlign: "center",
              }}
            >
              {title}
            </h1>

            {description && (
              <p
                style={{
                  fontSize: "24px",
                  color: `${accentColor}dd`,
                  marginBottom: "20px",
                  lineHeight: "1.4",
                  maxWidth: "600px",
                }}
              >
                {description}
              </p>
            )}

            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: `${accentColor}20`,
                  padding: "12px 24px",
                  borderRadius: "50px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    marginRight: "10px",
                  }}
                >
                  📍
                </div>
                <span
                  style={{
                    fontSize: "20px",
                    color: accentColor,
                    fontWeight: "500",
                  }}
                >
                  {location}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              display: "flex",
              alignItems: "center",
              color: `${accentColor}99`,
              fontSize: "18px",
            }}
          >
            {type === "pin" && "📌 Pin Details"}
            {type === "location" && "🌍 Location Page"}
            {type === "default" && "🗺️ Interactive Map"}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          // Same query → same image; let CDNs/browsers cache it.
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("OG Image generation error:", error);

    // Fallback simple image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#6366F1",
            color: "white",
            fontSize: "48px",
            fontWeight: "bold",
          }}
        >
          droPINion - Share Your Thoughts
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
