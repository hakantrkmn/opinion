import { cn } from "@/lib/utils";

interface PinIconProps {
  className?: string;
}

export function PinIcon({ className }: PinIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path d="M256 16C152 16 68 100 68 204c0 140 168 284 180 294a12 12 0 0 0 16 0c12-10 180-154 180-294C444 100 360 16 256 16z" />
      <rect x="148" y="112" width="216" height="152" rx="22" fill="#1a1a1a" />
      <polygon points="192,264 224,264 188,300" fill="#1a1a1a" />
      <rect x="184" y="148" width="144" height="14" rx="7" fill="currentColor" />
      <rect x="184" y="178" width="120" height="14" rx="7" fill="currentColor" />
      <rect x="184" y="208" width="132" height="14" rx="7" fill="currentColor" />
    </svg>
  );
}

/**
 * Returns sized inline SVG for MapLibre HTML string contexts
 */
export function pinIconHTML(size: number, color = "white") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="${color}"><path d="M256 16C152 16 68 100 68 204c0 140 168 284 180 294a12 12 0 0 0 16 0c12-10 180-154 180-294C444 100 360 16 256 16z"/><rect x="148" y="112" width="216" height="152" rx="22" fill="#1a1a1a"/><polygon points="192,264 224,264 188,300" fill="#1a1a1a"/><rect x="184" y="148" width="144" height="14" rx="7" fill="${color}"/><rect x="184" y="178" width="120" height="14" rx="7" fill="${color}"/><rect x="184" y="208" width="132" height="14" rx="7" fill="${color}"/></svg>`;
}
