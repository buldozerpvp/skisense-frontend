
export const FONT_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_DISPLAY = `"Plus Jakarta Sans", ${FONT_SANS}`;
export const FONT_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

export interface Palette {
  ink: string;
  inkMuted: string;
  inkFaint: string;
  brandDeep: string;
  brand: string;
  sky: string;
  skySoft: string;
  ice: string;
  frost: string;
  canvas: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  markFlake: string;
  markBars: string;
}

export const LIGHT_COLORS: Palette = {
  ink: "#0C2742",
  inkMuted: "#5A7183",
  inkFaint: "#8DA2B2",

  brandDeep: "#0E3A66",
  brand: "#1B4965",
  sky: "#3C8DD8",
  skySoft: "#76B6DE",
  ice: "#CFEEFF",
  frost: "#EBF7FF",

  canvas: "#F4F8FB",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  border: "#DCE7F0",
  borderStrong: "#C3D5E4",

  accent: "#E2703A",
  accentSoft: "#FDEAE0",

  positive: "#1BAF7A",
  positiveSoft: "#D9F2E8",
  negative: "#D03B3B",
  negativeSoft: "#FBE3E3",

  markFlake: "#0D3B66",
  markBars: "#4FC3F7",
};

export const DARK_COLORS: Palette = {
  ink: "#E8F1F8",
  inkMuted: "#A8BCCD",
  inkFaint: "#7C93A6",

  brandDeep: "#7FBDEA",
  brand: "#4E9BD8",
  sky: "#6FB2E6",
  skySoft: "#3E7CA8",
  ice: "#1C4766",
  frost: "#16344C",

  canvas: "#0A1A2A",
  surface: "#122A40",
  surfaceRaised: "#17344D",
  border: "#1E3C56",
  borderStrong: "#2C5376",

  accent: "#F08A52",
  accentSoft: "#3A2418",

  positive: "#3FD39C",
  positiveSoft: "#12352A",
  negative: "#FF6B6B",
  negativeSoft: "#3B1D1D",

  markFlake: "#F2F7FB",
  markBars: "#13457A",
};

const varName = (token: keyof Palette): string => {
  return `--ss-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
};

export const COLORS = Object.fromEntries(
  (Object.keys(LIGHT_COLORS) as (keyof Palette)[]).map((token) => [
    token,
    `var(${varName(token)})`,
  ]),
) as Record<keyof Palette, string>;

export type ThemeMode = "light" | "dark";

export const PALETTES: Record<ThemeMode, Palette> = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
};

const declarations = (palette: Palette): string => {
  return (Object.keys(palette) as (keyof Palette)[])
    .map((token) => `${varName(token)}:${palette[token]};`)
    .join("");
};

export const themeVariablesCss = (): string => {
  return [
    `:root{color-scheme:light;${declarations(LIGHT_COLORS)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;${declarations(DARK_COLORS)}}}`,
    `:root[data-theme="dark"]{color-scheme:dark;${declarations(DARK_COLORS)}}`,
    `:root[data-theme="light"]{color-scheme:light;${declarations(LIGHT_COLORS)}}`,
  ].join("");
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const SHADOWS = {
  card: "0 1px 2px rgba(12,39,66,0.06), 0 8px 24px -16px rgba(12,39,66,0.25)",
  raised: "0 2px 6px rgba(12,39,66,0.08), 0 18px 36px -20px rgba(12,39,66,0.35)",
  header: "0 1px 0 rgba(12,39,66,0.06)",
} as const;

export const DARK_SHADOWS = {
  card: "0 0 0 1px rgba(255,255,255,0.03)",
  raised: "0 12px 32px -12px rgba(0,0,0,0.65)",
  header: "0 1px 0 rgba(255,255,255,0.05)",
} as const;

export const EASING = [0.22, 1, 0.36, 1] as const;
export const DURATION = { fast: 0.18, base: 0.32, slow: 0.5 } as const;
