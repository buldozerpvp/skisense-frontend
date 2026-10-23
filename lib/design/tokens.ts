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
 */

/** Swap these two lines to change every typeface in the app. */
export const FONT_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_DISPLAY = `"Plus Jakarta Sans", ${FONT_SANS}`;
/** Loaded in app/layout.tsx; drop this if you switch to self-hosted fonts. */
export const FONT_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

export const COLORS = {
  /** Headings and body copy. Near-black with a blue cast, never pure #000. */
  ink: "#0C2742",
  inkMuted: "#5A7183",
  inkFaint: "#8DA2B2",

  /** Brand blues, dark to light. */
  brandDeep: "#0E3A66",
  brand: "#1B4965",
  sky: "#3C8DD8",
  skySoft: "#76B6DE",
  ice: "#CFEEFF",
  frost: "#EBF7FF",

  /** Surfaces. */
  canvas: "#F4F8FB",
  surface: "#FFFFFF",
  border: "#DCE7F0",
  borderStrong: "#C3D5E4",

  /** The one warm accent — highlights, best-price flags, calls to action. */
  accent: "#E2703A",
  accentSoft: "#FDEAE0",

  /** Data semantics. Validated pair; see lib/charts/palette.ts. */
  positive: "#1BAF7A",
  positiveSoft: "#D9F2E8",
  negative: "#D03B3B",
  negativeSoft: "#FBE3E3",
} as const;

/** Corner rounding, in px. */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** Soft, blue-tinted elevation — flat enough to stay professional. */
export const SHADOWS = {
  card: "0 1px 2px rgba(12,39,66,0.06), 0 8px 24px -16px rgba(12,39,66,0.25)",
  raised: "0 2px 6px rgba(12,39,66,0.08), 0 18px 36px -20px rgba(12,39,66,0.35)",
  header: "0 1px 0 rgba(12,39,66,0.06)",
} as const;

/** Motion. Short enough that nothing gets in the way of reading a number. */
export const EASING = [0.22, 1, 0.36, 1] as const;
export const DURATION = { fast: 0.18, base: 0.32, slow: 0.5 } as const;
