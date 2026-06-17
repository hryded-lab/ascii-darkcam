import { RAMPS, type RampKey } from "./charsets";

export type ColorMode = "mono" | "source" | "duotone" | "palette";
export type GlyphMode = "ramp" | "rain" | "edge" | "braille";

export type Palette = [number, string][];

export interface AsciiFilter {
  id: string;
  name: string;
  blurb: string;
  ramp: RampKey;
  customRamp?: string;
  glyphMode: GlyphMode;
  colorMode: ColorMode;
  fg: string;
  fg2?: string;
  palette?: Palette;
  background: string;
  glow?: { color: string; blur: number };
  gamma?: number;
  cellTint?: number;
  saturate?: number;
  edgeThreshold?: number;
  scanlines?: number;
  flicker?: boolean;
}

const base = {
  glyphMode: "ramp" as GlyphMode,
  gamma: 1,
};

export const FILTERS: AsciiFilter[] = [
  {
    ...base,
    id: "classic",
    name: "Classic",
    blurb: "@%#*+=-:. density ramp",
    ramp: "classic",
    colorMode: "mono",
    fg: "#e9e9e9",
    background: "#0a0a0a",
  },
  {
    ...base,
    id: "matrix",
    name: "Matrix",
    blurb: "Glowing katakana rain",
    ramp: "classic",
    glyphMode: "rain",
    colorMode: "mono",
    fg: "#46ff5a",
    background: "#000400",
    glow: { color: "#19ff4a", blur: 7 },
    flicker: true,
  },
  {
    ...base,
    id: "color",
    name: "True Color",
    blurb: "Glyphs tinted by the pixel",
    ramp: "detailed",
    colorMode: "source",
    fg: "#ffffff",
    background: "#060608",
    cellTint: 0.2,
    saturate: 1.45,
  },
  {
    ...base,
    id: "blocks",
    name: "Blocks",
    blurb: "░▒▓█ painterly shading",
    ramp: "blocks",
    colorMode: "source",
    fg: "#9bd2ff",
    background: "#0b0b12",
    cellTint: 0.28,
    saturate: 1.35,
  },
  {
    ...base,
    id: "braille",
    name: "Braille",
    blurb: "8× dot-matrix halftone",
    ramp: "classic",
    glyphMode: "braille",
    colorMode: "source",
    fg: "#eaffea",
    background: "#050608",
  },
  {
    ...base,
    id: "contour",
    name: "Contour",
    blurb: "Edge sketch with | / — \\",
    ramp: "classic",
    glyphMode: "edge",
    colorMode: "mono",
    fg: "#d7faff",
    background: "#05080a",
    glow: { color: "#39d8ff", blur: 5 },
    edgeThreshold: 42,
  },
  {
    ...base,
    id: "neon",
    name: "Neon",
    blurb: "Cyberpunk luminance gradient",
    ramp: "detailed",
    colorMode: "palette",
    fg: "#ffffff",
    palette: [
      [0, "#10032e"],
      [0.4, "#7b2ff7"],
      [0.7, "#ff2bd1"],
      [1, "#1ef7ff"],
    ],
    background: "#070019",
    glow: { color: "#ff2bd1", blur: 6 },
    cellTint: 0.16,
  },
  {
    ...base,
    id: "thermal",
    name: "Thermal",
    blurb: "Heat-map false color",
    ramp: "blocks",
    colorMode: "palette",
    fg: "#ffffff",
    palette: [
      [0, "#000018"],
      [0.25, "#3a0ca3"],
      [0.5, "#d00000"],
      [0.75, "#ff8800"],
      [1, "#fff7cc"],
    ],
    background: "#000008",
  },
  {
    ...base,
    id: "amber",
    name: "Amber CRT",
    blurb: "Vintage phosphor terminal",
    ramp: "classic",
    colorMode: "duotone",
    fg: "#ffb000",
    fg2: "#3a1d00",
    background: "#160d00",
    glow: { color: "#ff8c00", blur: 6 },
    scanlines: 0.32,
    flicker: true,
  },
  {
    ...base,
    id: "ink",
    name: "Ink",
    blurb: "Black glyphs on cream",
    ramp: "ink",
    colorMode: "mono",
    fg: "#0c0c0c",
    background: "#f3efe2",
    gamma: 0.72,
  },
];

export const CUSTOM_FILTER_BASE: AsciiFilter = {
  ...base,
  id: "custom",
  name: "Custom",
  blurb: "Your glyphs, your colors",
  ramp: "classic",
  customRamp: " .:-=+*#%@",
  colorMode: "source",
  fg: "#ffffff",
  background: "#0a0a0a",
};

export function rampFor(filter: AsciiFilter): string {
  return filter.customRamp && filter.customRamp.length > 0
    ? filter.customRamp
    : RAMPS[filter.ramp];
}
