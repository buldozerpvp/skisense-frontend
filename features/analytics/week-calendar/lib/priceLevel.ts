import { interpolateLab } from "d3-interpolate";
import { scaleDiverging } from "d3-scale";
import type { ChartColors } from "@/shared/charts/lib/palette";
import type { WeekCalendarModel } from "@/features/analytics/week-calendar/lib/buildWeekCalendar";

export type PriceLevelScale = (price: number) => string;

export const priceLevelScale = (model: WeekCalendarModel, colors: ChartColors): PriceLevelScale => {
  const low = Math.min(model.low, model.mid - 1);
  const high = Math.max(model.high, model.mid + 1);
  return scaleDiverging<string>()
    .domain([low, model.mid, high])
    .clamp(true)
    .interpolator((t) =>
      t < 0.5
        ? interpolateLab(colors.drop, colors.neutralSoft)(t * 2)
        : interpolateLab(colors.neutralSoft, colors.rise)((t - 0.5) * 2)
    );
};
