import type {
  ExpressionSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { PIN_ACTIVITY } from "@/features/pins/lib/activity";

/** Pin colors per activity tier (mirrors the detail header). */
export const PIN_COLORS = {
  new: PIN_ACTIVITY.new.color,
  active: PIN_ACTIVITY.active.color,
  hot: PIN_ACTIVITY.hot.color,
} as const;

type Tier = keyof typeof PIN_COLORS;
const TIERS = Object.keys(PIN_COLORS) as Tier[];
const imageId = (tier: Tier) => `dp-pin-${tier}`;

/** icon-image expression choosing the tier image from `comments_count`. */
export function pinImageExpression(): ExpressionSpecification {
  return [
    "step",
    ["coalesce", ["get", "comments_count"], 0],
    imageId("new"),
    PIN_ACTIVITY.active.min,
    imageId("active"),
    PIN_ACTIVITY.hot.min,
    imageId("hot"),
  ];
}

// The brand pin (same shapes as components/icons/PinIcon) in a 512 viewBox.
const OUTER =
  "M256 16C152 16 68 100 68 204c0 140 168 284 180 294a12 12 0 0 0 16 0c12-10 180-154 180-294C444 100 360 16 256 16z";
const PIXEL_RATIO = 2;
const LOGICAL_W = 32;
const LOGICAL_H = 40;

const cache = new Map<Tier, ImageData>();

function renderPin(color: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = LOGICAL_W * PIXEL_RATIO;
  canvas.height = LOGICAL_H * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 512-unit glyph → ~26px wide, tip ~3px above the image bottom
  const scale = (26 / 376) * PIXEL_RATIO;
  ctx.translate(
    (LOGICAL_W * PIXEL_RATIO) / 2 - 256 * scale,
    (LOGICAL_H - 3) * PIXEL_RATIO - 500 * scale
  );
  ctx.scale(scale, scale);

  const outer = new Path2D(OUTER);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 3 * PIXEL_RATIO; // shadows ignore the transform
  ctx.shadowOffsetY = 1.5 * PIXEL_RATIO;
  ctx.fillStyle = color;
  ctx.fill(outer);
  ctx.restore();

  ctx.lineWidth = 36;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke(outer);
  ctx.fillStyle = color;
  ctx.fill(outer);

  // speech bubble
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.roundRect(148, 112, 216, 152, 22);
  ctx.moveTo(192, 264);
  ctx.lineTo(224, 264);
  ctx.lineTo(188, 300);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  for (const [y, w] of [
    [148, 144],
    [178, 120],
    [208, 132],
  ] as const) {
    ctx.beginPath();
    ctx.roundRect(184, y, w, 14, 7);
    ctx.fill();
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Adds the pin images to the current style (no-op when already present). */
export function ensurePinImages(map: MapLibreMap) {
  for (const tier of TIERS) {
    const id = imageId(tier);
    if (map.hasImage(id)) continue;
    let image = cache.get(tier);
    if (!image) {
      const rendered = renderPin(PIN_COLORS[tier]);
      if (!rendered) continue;
      image = rendered;
      cache.set(tier, image);
    }
    map.addImage(id, image, { pixelRatio: PIXEL_RATIO });
  }
}
