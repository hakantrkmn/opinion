/**
 * Shared look for floating map controls: 40px with a mouse, 44px on touch,
 * press feedback, hover gated by Tailwind v4 (`hover:` only on hover devices).
 */
export const mapControl =
  "pointer-events-auto flex size-10 select-none items-center justify-center rounded-xl border border-border/60 bg-background/90 text-foreground shadow-float backdrop-blur-md touch-manipulation transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out hover:border-border hover:bg-background active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11 [&_svg]:size-[18px]";

/** Floating pill surfaces (scope toggle, status, intro card). */
export const mapSurface =
  "border border-border/60 bg-background/90 shadow-float backdrop-blur-md";
