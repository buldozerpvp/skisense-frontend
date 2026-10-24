import { scaleDiverging, scaleLinear } from "d3-scale";
import { interpolateLab } from "d3-interpolate";
import { PALETTES, type ThemeMode } from "@/lib/design/tokens";
import { useThemeMode } from "@/lib/design/useThemeMode";

/**
 * Colours are assigned by the job they do, not by taste.
 *
 * Diverging (price change, the polarity job): aqua = cheaper, red = pricier,
 * neutral grey midpoint. This exact pair was validated rather than eyeballed —
 * worst-pair CVD ΔE 9.9 under deuteranopia (target ≥8), normal-vision ΔE 31.9
 * (floor ≥15). The obvious green/red pairing FAILS that check at ΔE 4.1, which
 * is why it isn't used here. Aqua sits at 2.82:1 on white (just under 3:1), so
 * every chart using it also ships direct labels and a table view as relief.
 *
 * Sequential (price level, the magnitude job): one hue, light -> brand navy.
 *
 * Brand navy is chrome only — axes, titles, reference lines, selection — so it
 * never competes with the data encodings.
 */
/**
 * The chart palette for one theme.
 *
 * Unlike the rest of the app, charts can't use the CSS variables: d3
 * interpolates between these values to build its scales, so it needs real
 * colours. That is the only reason charts know which mode they are in.
 *
 * The dark values are not the light ones reused. Aqua and red are both
 * lifted until they clear 4.5:1 on the dark surface, and the neutral grey is
 * re-picked so "no change" still reads as absence rather than as a third
 * colour.
 */
export function chartColors(mode: ThemeMode) {
  const COLORS = PALETTES[mode];
  const dark = mode === "dark";
  return {
    // Data encodings — validated pair, do not re-tune by eye.
    drop: COLORS.positive,
    dropSoft: dark ? "#1C4F3E" : "#bfe7d8",
    rise: COLORS.negative,
    riseSoft: dark ? "#5A2A2A" : "#f2c9c9",
    neutral: dark ? "#8A97A3" : "#898781",
    neutralSoft: dark ? "#223141" : "#f0efec",

    // Chrome — comes from the app's design tokens so charts match the UI.
    brand: COLORS.brand,
    /** Ranking-ladder lines: identity without hue coding, so crossings read as shape. */
    skyLine: COLORS.skySoft,
    accent: COLORS.accent,
    ink: COLORS.ink,
    inkSecondary: COLORS.inkMuted,
    muted: COLORS.inkFaint,
    grid: COLORS.border,
    axis: COLORS.borderStrong,
    surface: COLORS.surface,
  } as const;
}

export type ChartColors = ReturnType<typeof chartColors>;

/**
 * The chart palette for the active theme.
 *
 * Every chart calls this instead of importing a fixed palette, and rebuilds
 * its scales from the result — which is what makes a theme switch recolour
 * the marks as well as the chrome.
 */
export function useChartColors(): ChartColors {
  const { mode } = useThemeMode();
  return chartColors(mode);
}

/** The light palette, for module-scope defaults and non-React callers. */
export const CHART_COLORS = chartColors("light");

/** Sequential ramp for absolute price level (heatmaps, density). */
export function makeLevelRamp(colors: ChartColors = CHART_COLORS) {
  return scaleLinear<string>()
    .range([colors.surface, colors.brand])
    .interpolate(interpolateLab)
    .clamp(true);
}

/** The light ramp, kept for callers that don't take a palette. */
export const levelRamp = makeLevelRamp();

/**
 * Diverging colour for a percentage price change. Domain is symmetric so a −8%
 * and a +8% read as mirror intensities.
 */
export function makeChangeScale(maxAbsPct: number, colors: ChartColors = CHART_COLORS) {
  const bound = Math.max(maxAbsPct, 1);
  return scaleDiverging<string>()
    .domain([-bound, 0, bound])
    .interpolator((t) => {
      // t runs 0..1 across the full domain; 0.5 is "no change".
      if (t < 0.5) return interpolateLab(colors.drop, colors.neutralSoft)(t * 2);
      return interpolateLab(colors.neutralSoft, colors.rise)((t - 0.5) * 2);
    });
}

/** Flat colour for a signed change, used for text, glyphs and bar fills. */
export function changeColor(
  value: number | null | undefined,
  colors: ChartColors = CHART_COLORS,
): string {
  if (value === null || value === undefined || value === 0) return colors.neutral;
  return value < 0 ? colors.drop : colors.rise;
}

/**
 * Animation timings. Comprehension first — nothing decorative runs longer than
 * this, and any single data change finishes within ~700ms including stagger.
 */
export const MOTION = {
  drawIn: 0.7,
  grow: 0.4,
  stagger: 0.025,
  settle: 0.35,
  hover: 0.12,
  /** A mark moving because the data changed. Shorter than drawIn: the reader
   *  already has context and only needs to track the move. */
  move: 0.45,
  /** A rank crossing in the ladder — long enough to follow one line through it. */
  reorder: 0.55,
  /** Counting a KPI number up to its new value. */
  count: 0.8,
  /** How long the scrubber rests on each snapshot day while playing. */
  scrubStep: 0.9,
  /** No list may take longer than this to finish entering, however long it is. */
  staggerCap: 0.3,
} as const;

/** Easing curves, named by the job they do. */
export const EASE = {
  arrive: [0.16, 1, 0.3, 1],
  move: [0.22, 1, 0.36, 1],
  reorder: [0.65, 0, 0.35, 1],
} as const;
