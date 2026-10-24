/**
 * Design tokens — the single place to change how SkiSense looks.
 *
 * Everything visual reads from here: the MUI theme (lib/theme.ts), the charts
 * (lib/charts/palette.ts) and the Tailwind pieces (the `@theme` block in
 * app/globals.css mirrors the handful of colours those classes need).
 *
 * Palette direction: alpine. Deep navy ink and glacier blues taken from the
 * logo mark and the slope illustration, snow-white surfaces, and one warm
 * accent borrowed from a skier's jacket — used sparingly, so it always means
 * "look here".
 *
 * There are two palettes and three ways to reach them:
 *
 * - `LIGHT_COLORS` / `DARK_COLORS` are the literal hex values. Use these only
 *   where a real colour is required — the MUI theme (it runs `alpha()` over
 *   them) and the charts (d3 interpolates between them).
 * - `COLORS` holds the same keys as CSS custom properties. Use it in `sx` and
 *   inline styles: the value follows the active mode with no re-render,
 *   because the browser resolves the variable.
 * - `themeVariablesCss()` emits both sets, and is injected once in the layout
 *   so the variables exist before first paint.
 */

/** Swap these two lines to change every typeface in the app. */
export const FONT_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_DISPLAY = `"Plus Jakarta Sans", ${FONT_SANS}`;
/** Loaded in app/layout.tsx; drop this if you switch to self-hosted fonts. */
export const FONT_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

/** The shape both palettes share. Add a key here and both must define it. */
export interface Palette {
  /** Headings and body copy. Never pure black, never pure white. */
  ink: string;
  inkMuted: string;
  inkFaint: string;
  /** Brand blues, dark to light. */
  brandDeep: string;
  brand: string;
  sky: string;
  skySoft: string;
  ice: string;
  /** The tinted surface: table headers, selected rows, quiet panels. */
  frost: string;
  /** Surfaces, back to front. */
  canvas: string;
  surface: string;
  /** One step in front of `surface` — menus, hovered rows, raised tiles. */
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  /** The one warm accent — highlights, best-price flags, calls to action. */
  accent: string;
  accentSoft: string;
  /** Data semantics. Validated pair; see lib/charts/palette.ts. */
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
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
};

/**
 * Dark is not the light palette inverted.
 *
 * Three rules it follows, each of which shows if broken: surfaces get lighter
 * as they come forward (canvas → surface → raised), rather than darker; the
 * ground is a deep navy rather than black, because the aqua vibrates against
 * true black; and every foreground colour is lifted until it clears 4.5:1 on
 * `surface`, which is why the accent and the data pair are not the light
 * values reused.
 */
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
};

/** The CSS custom property that carries one token. */
function varName(token: keyof Palette): string {
  // ink -> --ss-ink, inkMuted -> --ss-ink-muted
  return `--ss-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/**
 * The palette as CSS variables.
 *
 * Reach for this in `sx` and inline styles. Because the value is a variable
 * rather than a colour, a component written against it switches theme without
 * re-rendering and without reading any context — which is what keeps the
 * table and every chart wrapper free of theme plumbing.
 */
export const COLORS = Object.fromEntries(
  (Object.keys(LIGHT_COLORS) as (keyof Palette)[]).map((token) => [
    token,
    `var(${varName(token)})`,
  ]),
) as Record<keyof Palette, string>;

/** The two modes, as the rest of the app names them. */
export type ThemeMode = "light" | "dark";

export const PALETTES: Record<ThemeMode, Palette> = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
};

function declarations(palette: Palette): string {
  return (Object.keys(palette) as (keyof Palette)[])
    .map((token) => `${varName(token)}:${palette[token]};`)
    .join("");
}

/**
 * Both palettes as a stylesheet, injected once in the layout.
 *
 * `[data-theme]` wins over the media query, so the system preference applies
 * until someone picks a side, and their pick then holds. The attribute is set
 * by an inline script before first paint (see app/layout.tsx), so a visitor
 * who prefers dark never sees a white flash.
 */
export function themeVariablesCss(): string {
  return [
    `:root{color-scheme:light;${declarations(LIGHT_COLORS)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;${declarations(DARK_COLORS)}}}`,
    `:root[data-theme="dark"]{color-scheme:dark;${declarations(DARK_COLORS)}}`,
    `:root[data-theme="light"]{color-scheme:light;${declarations(LIGHT_COLORS)}}`,
  ].join("");
}

/** Corner rounding, in px. */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/**
 * Soft, blue-tinted elevation — flat enough to stay professional.
 *
 * Shadows are a light-mode device: on a dark ground a shadow is invisible, so
 * the dark theme separates surfaces by lightness and border instead. These
 * stay in the light values and `lib/theme.ts` drops them in dark mode.
 */
export const SHADOWS = {
  card: "0 1px 2px rgba(12,39,66,0.06), 0 8px 24px -16px rgba(12,39,66,0.25)",
  raised: "0 2px 6px rgba(12,39,66,0.08), 0 18px 36px -20px rgba(12,39,66,0.35)",
  header: "0 1px 0 rgba(12,39,66,0.06)",
} as const;

/** Dark-mode elevation: a visible edge rather than a shadow nobody can see. */
export const DARK_SHADOWS = {
  card: "0 0 0 1px rgba(255,255,255,0.03)",
  raised: "0 12px 32px -12px rgba(0,0,0,0.65)",
  header: "0 1px 0 rgba(255,255,255,0.05)",
} as const;

/** Motion. Short enough that nothing gets in the way of reading a number. */
export const EASING = [0.22, 1, 0.36, 1] as const;
export const DURATION = { fast: 0.18, base: 0.32, slow: 0.5 } as const;
