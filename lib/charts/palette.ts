import { scaleDiverging, scaleLinear } from "d3-scale";
import { interpolateLab } from "d3-interpolate";
import { COLORS } from "@/lib/design/tokens";

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
export const CHART_COLORS = {
  // Data encodings — validated pair, do not re-tune by eye.
  drop: COLORS.positive,
  dropSoft: "#bfe7d8",
  rise: COLORS.negative,
  riseSoft: "#f2c9c9",
  neutral: "#898781",
  neutralSoft: "#f0efec",

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

/** Sequential ramp for absolute price level (heatmaps, density). */
export const levelRamp = scaleLinear<string>()
  .range([COLORS.frost, CHART_COLORS.brand])
  .interpolate(interpolateLab)
  .clamp(true);

/**
 * Diverging colour for a percentage price change. Domain is symmetric so a −8%
 * and a +8% read as mirror intensities.
 */
export function makeChangeScale(maxAbsPct: number) {
  const bound = Math.max(maxAbsPct, 1);
  return scaleDiverging<string>()
    .domain([-bound, 0, bound])
    .interpolator((t) => {
      // t runs 0..1 across the full domain; 0.5 is "no change".
      if (t < 0.5) return interpolateLab(CHART_COLORS.drop, CHART_COLORS.neutralSoft)(t * 2);
      return interpolateLab(CHART_COLORS.neutralSoft, CHART_COLORS.rise)((t - 0.5) * 2);
    });
}

/** Flat colour for a signed change, used for text, glyphs and bar fills. */
export function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return CHART_COLORS.neutral;
  return value < 0 ? CHART_COLORS.drop : CHART_COLORS.rise;
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
