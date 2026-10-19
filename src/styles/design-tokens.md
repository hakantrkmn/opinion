# droPINion Design Tokens

Source of truth: `src/app/globals.css` (`:root`, `.dark`, `@theme inline`).
Use semantic utilities (`bg-primary`, `text-muted-foreground`), not raw palette
colors, in app UI.

## Color

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--primary` | `oklch(0.54 0.13 163)` emerald | `oklch(0.765 0.177 163)` | White text on light primary is 4.7:1 (AA) |
| `--primary-foreground` | near-white | `oklch(0.18 0.03 163)` dark ink | Dark ink on the bright dark-mode green (9.7:1) |
| `--muted-foreground` | `oklch(0.443 0 0)` | `oklch(0.746 0 0)` | ≥7:1 on background in both themes |
| `--destructive` | red | lighter red | |

Map pins keep their own activity colors (`src/features/pins/lib/activity.ts`:
emerald-400 / emerald-500 / amber-500). Cluster circles use one step deeper
(emerald-600 / emerald-700 / amber-600) so white counts stay legible on the
light, dark and colorful basemaps.

## Stacking (z-index)

Use `z-(--z-…)`, never ad-hoc numbers.

| Layer | Token | Value |
| --- | --- | --- |
| Floating map controls | `--z-map-controls` | 10 |
| Sticky header | `--z-header` | 40 |
| Dialog / bottom sheet / side panel | `--z-dialog` | 80 |
| Dialog opened from a dialog (lightbox, camera) | `--z-dialog-nested` | 90 |
| Alert dialog (confirmations) | `--z-alert` | 100 |
| Popover / select / menu | `--z-popover` | 110 |
| Toast | `--z-toast` | 120 |

## Elevation

`shadow-float` (map controls, pills), `shadow-raised` (menus, cards over the
map, toasts), `shadow-fab` (the "Drop a pin" button).

## Radius

`--radius` 10px; controls `rounded-xl`, cards `rounded-2xl`, sheets
`rounded-[1.75rem]` (mobile top corners) / `rounded-[1.5rem]` (desktop panel).

## Motion

- `ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)` (overrides Tailwind's default),
  `ease-in-out` = `cubic-bezier(0.77, 0, 0.175, 1)`, `ease-drawer` =
  `cubic-bezier(0.32, 0.72, 0, 1)` for sheets.
- Press feedback: `active:scale-[0.96–0.97]`, 150ms. Popovers/menus 150ms,
  dialogs 200ms, bottom sheet 300ms in / 200ms out.
- Animate `transform`/`opacity` only; list exact properties in `transition-[…]`.
- `prefers-reduced-motion`: animations/transitions collapse to instant (spinners
  keep turning).

## Touch & focus

- Interactive targets: 40px with a mouse, 44px on touch (`pointer-coarse:size-11`).
- Hover styles only apply on hover devices (Tailwind v4 default).
- Keyboard focus: 2px `--ring` outline via a global `:focus-visible` rule;
  shadcn components keep their own ring.

## Layout

- Header height `--header-height` (3.5rem) + `env(safe-area-inset-top)`.
- Floating map UI and sheets pad with `env(safe-area-inset-*)`.
- Pin detail: bottom sheet on phones, floating right side panel on ≥640px
  (`ResponsiveDialogContent desktopSide="right"`).
- Toasts: top-center, below the header.
