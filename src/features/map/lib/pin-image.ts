import type {
  ExpressionSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { COMMUNITY_COLOR_KEYS, COMMUNITY_COLORS } from "@/constants/community-colors";
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
const COMMUNITY_IMAGE_PREFIX = "dp-pin-community-";

/** The community's color image when the feature has `prop`, else `fallback`. */
function communityOr(prop: string, fallback: ExpressionSpecification | string): ExpressionSpecification {
  return ["case", ["has", prop], ["concat", COMMUNITY_IMAGE_PREFIX, ["get", prop]], fallback];
}

/**
 * icon-image expression: a community-only pin in its community's color,
 * any other pin in its activity tier color (from `comments_count`).
 */
export function pinImageExpression(): ExpressionSpecification {
  return communityOr("community_color", [
    "step",
    ["coalesce", ["get", "comments_count"], 0],
    imageId("new"),
    PIN_ACTIVITY.active.min,
    imageId("active"),
    PIN_ACTIVITY.hot.min,
    imageId("hot"),
  ]);
}

/** icon-image for a server cluster's single pin (`color` set for community pins). */
export function singlePinImageExpression(): ExpressionSpecification {
  return communityOr("color", imageId("active"));
}

// The brand pin (same shapes as components/icons/PinIcon) in a 512 viewBox.
const OUTER =
  "M256 16C152 16 68 100 68 204c0 140 168 284 180 294a12 12 0 0 0 16 0c12-10 180-154 180-294C444 100 360 16 256 16z";
const PIXEL_RATIO = 2;
const LOGICAL_W = 32;
const LOGICAL_H = 40;

const cache = new Map<string, ImageData>();

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

/** Badge drawn on community-only pins (a lock in a dark disc). */
export const LOCK_BADGE_IMAGE = "dp-pin-lock";
const BADGE_SIZE = 16;
let lockBadge: ImageData | null = null;

function renderLockBadge(): ImageData | null {
  const px = BADGE_SIZE * PIXEL_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // disc with a white ring so it reads on any basemap and on the pin
  ctx.beginPath();
  ctx.arc(8, 8, 7.25, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // lock: shackle + body
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(8, 6.6, 1.9, Math.PI, 0);
  ctx.lineTo(9.9, 7.6);
  ctx.moveTo(6.1, 6.6);
  ctx.lineTo(6.1, 7.6);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(4.9, 7.5, 6.2, 4.6, 1);
  ctx.fill();

  return ctx.getImageData(0, 0, px, px);
}

/** Adds the pin images to the current style (no-op when already present). */
export function ensurePinImages(map: MapLibreMap) {
  if (!map.hasImage(LOCK_BADGE_IMAGE)) {
    lockBadge ??= renderLockBadge();
    if (lockBadge) map.addImage(LOCK_BADGE_IMAGE, lockBadge, { pixelRatio: PIXEL_RATIO });
  }
  const images: Array<[string, string]> = [
    ...TIERS.map((tier): [string, string] => [imageId(tier), PIN_COLORS[tier]]),
    ...COMMUNITY_COLOR_KEYS.map((key): [string, string] => [
      `${COMMUNITY_IMAGE_PREFIX}${key}`,
      COMMUNITY_COLORS[key],
    ]),
  ];
  for (const [id, color] of images) {
    if (map.hasImage(id)) continue;
    let image = cache.get(id);
    if (!image) {
      const rendered = renderPin(color);
      if (!rendered) continue;
      image = rendered;
      cache.set(id, image);
    }
    map.addImage(id, image, { pixelRatio: PIXEL_RATIO });
  }
}
