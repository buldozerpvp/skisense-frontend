import { scaleDiverging, scaleLinear } from "d3-scale";
import { interpolateLab } from "d3-interpolate";
import { PALETTES, type ThemeMode } from "@/shared/design/tokens";
import { useThemeMode } from "@/features/app-shell/hooks/useThemeMode";

export const chartColors = (mode: ThemeMode) => {
  const COLORS = PALETTES[mode];
  const dark = mode === "dark";
  return {
    drop: COLORS.positive,
    dropSoft: dark ? "#1C4F3E" : "#bfe7d8",
    rise: COLORS.negative,
    riseSoft: dark ? "#5A2A2A" : "#f2c9c9",
    neutral: dark ? "#8A97A3" : "#898781",
    neutralSoft: dark ? "#223141" : "#f0efec",

    brand: COLORS.brand,
    skyLine: COLORS.skySoft,
    accent: COLORS.accent,
    ink: COLORS.ink,
    inkSecondary: COLORS.inkMuted,
    muted: COLORS.inkFaint,
    grid: COLORS.border,
    axis: COLORS.borderStrong,
    surface: COLORS.surface,
  } as const;
};

export type ChartColors = ReturnType<typeof chartColors>;

export const useChartColors = (): ChartColors => {
  const { mode } = useThemeMode();
  return chartColors(mode);
};

export const CHART_COLORS = chartColors("light");

export const makeLevelRamp = (colors: ChartColors = CHART_COLORS) => {
  return scaleLinear<string>()
    .range([colors.surface, colors.brand])
    .interpolate(interpolateLab)
    .clamp(true);
};

export const levelRamp = makeLevelRamp();

export const makeChangeScale = (maxAbsPct: number, colors: ChartColors = CHART_COLORS) => {
  const bound = Math.max(maxAbsPct, 1);
  return scaleDiverging<string>()
    .domain([-bound, 0, bound])
    .interpolator((t) => {
      if (t < 0.5) return interpolateLab(colors.drop, colors.neutralSoft)(t * 2);
      return interpolateLab(colors.neutralSoft, colors.rise)((t - 0.5) * 2);
    });
};

export const changeColor = (value: number | null | undefined, colors: ChartColors = CHART_COLORS): string => {
  if (value === null || value === undefined || value === 0) return colors.neutral;
  return value < 0 ? colors.drop : colors.rise;
};

export const MOTION = {
  drawIn: 0.7,
  grow: 0.4,
  stagger: 0.025,
  settle: 0.35,
  hover: 0.12,
  move: 0.45,
  reorder: 0.55,
  count: 0.8,
  scrubStep: 0.9,
  staggerCap: 0.3,
} as const;

export const EASE = {
  arrive: [0.16, 1, 0.3, 1],
  move: [0.22, 1, 0.36, 1],
  reorder: [0.65, 0, 0.35, 1],
} as const;
