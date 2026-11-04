/**
 * Labels live in messages/<locale>/map.json under `basemap.<choice>`.
 *
 * OpenFreeMap vector styles: free, no API key. Attribution (OpenFreeMap,
 * OpenMapTiles, OpenStreetMap) ships with the tiles' TileJSON and is shown by
 * the map's AttributionControl.
 */
export const BASEMAPS = {
  light: {
    url: "https://tiles.openfreemap.org/styles/positron",
    dark: false,
  },
  dark: {
    url: "https://tiles.openfreemap.org/styles/dark",
    dark: true,
  },
  colorful: {
    url: "https://tiles.openfreemap.org/styles/liberty",
    dark: false,
  },
} as const;

export type Basemap = keyof typeof BASEMAPS;
/** "auto" follows the app theme (next-themes). */
export type BasemapChoice = "auto" | Basemap;

export const BASEMAP_CHOICES: BasemapChoice[] = [
  "auto",
  "light",
  "dark",
  "colorful",
];

export function resolveBasemap(
  choice: BasemapChoice,
  resolvedTheme: string | undefined
): Basemap {
  if (choice !== "auto") return choice;
  return resolvedTheme === "dark" ? "dark" : "light";
}

/** Fonts available on the OpenFreeMap glyph server. */
export const MAP_FONT_REGULAR = ["Noto Sans Regular"];
export const MAP_FONT_BOLD = ["Noto Sans Bold"];
