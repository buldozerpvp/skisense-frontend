"use client";

import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useAllOffers } from "@/features/prices/hooks/usePrices";
import { useChartColors } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { eur, shortDate } from "@/shared/format/formatters";
import {
  bestWeekPerResort,
  buildWeekCalendar,
  cellKey,
  type WeekStart,
} from "@/features/analytics/week-calendar/lib/buildWeekCalendar";
import { priceLevelScale } from "@/features/analytics/week-calendar/lib/priceLevel";
import { useFrameCycle } from "@/features/analytics/week-calendar/hooks/useFrameCycle";
import {
  BEST_WEEK_DOT_RADIUS_PX,
  CELL_GAP_PX,
  CELL_RADIUS_PX,
  LEGEND_HEIGHT_PX,
  MONTH_LABEL_HEIGHT_PX,
  NIGHT_FADE_MS,
  ROW_HEIGHT_PX,
  ROW_LABEL_WIDTH_PX,
} from "@/features/analytics/week-calendar/constants";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const RIGHT_PAD_PX = 8;
const REST_FADE_MS = 600;
const GRADIENT_ID = "week-calendar-level";

const monthOf = (week: WeekStart): string => MONTH.format(new Date(`${week}T00:00:00Z`));

interface CalendarTableRow {
  resort: string;
  weeksOnSale: number;
  cheapestWeek: WeekStart | null;
  cheapestPrice: number | null;
  dearestPrice: number | null;
}

const tableColumns: TableColumn<CalendarTableRow>[] = [
  { header: "Resort", render: (row) => row.resort },
  { header: "Weeks on sale", numeric: true, render: (row) => row.weeksOnSale },
  { header: "Cheapest week", render: (row) => (row.cheapestWeek ? shortDate(row.cheapestWeek) : "—") },
  {
    header: "Cheapest",
    numeric: true,
    render: (row) => (row.cheapestPrice === null ? "—" : eur(Math.round(row.cheapestPrice))),
  },
  {
    header: "Dearest",
    numeric: true,
    render: (row) => (row.dearestPrice === null ? "—" : eur(Math.round(row.dearestPrice))),
  },
];

export const WeekCalendar = () => {
  const { data: history, isFetching } = useAllOffers();
  const colors = useChartColors();
  const { reduced } = useChartMotion();
  const { ref: measureRef, width } = useChartDimensions(960);

  const model = useMemo(() => buildWeekCalendar(history), [history]);
  const level = useMemo(() => priceLevelScale(model, colors), [model, colors]);

  const { index, resting, hostRef, hold, release } = useFrameCycle(model.frames.length, reduced);

  const frame = model.frames[index];
  const bestWeeks = useMemo(
    () => (frame ? bestWeekPerResort(frame, model.resorts) : new Map<string, WeekStart>()),
    [frame, model.resorts]
  );

  const gridWidth = Math.max(width - ROW_LABEL_WIDTH_PX - RIGHT_PAD_PX, 1);
  const cellWidth = gridWidth / Math.max(model.weeks.length, 1);
  const gridHeight = model.resorts.length * ROW_HEIGHT_PX;
  const height = MONTH_LABEL_HEIGHT_PX + gridHeight + LEGEND_HEIGHT_PX;

  const monthMarks = useMemo(() => {
    const marks: { week: WeekStart; label: string; at: number }[] = [];
    let previous = "";
    model.weeks.forEach((week, column) => {
      const label = monthOf(week);
      if (label === previous) return;
      previous = label;
      marks.push({ week, label, at: column });
    });
    return marks;
  }, [model.weeks]);

  const tableRows = useMemo<CalendarTableRow[]>(() => {
    if (!frame) return [];
    return model.resorts.map((resort) => {
      const prices = model.weeks
        .map((week) => frame.best.get(cellKey(resort, week)))
        .filter((price): price is number => price !== undefined);
      return {
        resort,
        weeksOnSale: prices.length,
        cheapestWeek: bestWeeks.get(resort) ?? null,
        cheapestPrice: prices.length ? Math.min(...prices) : null,
        dearestPrice: prices.length ? Math.max(...prices) : null,
      };
    });
  }, [frame, model.resorts, model.weeks, bestWeeks]);

  const cellTransition = reduced
    ? undefined
    : `fill ${NIGHT_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${NIGHT_FADE_MS}ms linear`;

  const caption = frame
    ? `What a ski week costs across ${model.resorts.length} resorts and ${model.weeks.length} departure weeks, as collected on ${shortDate(frame.day)}.`
    : "Not enough collected nights yet.";

  return (
    <ChartCard
      title="What a ski week costs, week by week"
      subtitle="Resorts down, departure weeks across. Each square is the cheapest 6–7 night stay on sale there, priced for two — green is cheap, red is dear, and the dot marks each resort's best week. The shades shift as the collected nights replay."
      isEmpty={model.frames.length < 2 || model.resorts.length === 0}
      emptyMessage="Two nights of collection are needed before prices can be watched moving."
      isFetching={isFetching}
      tableRows={tableRows}
      tableColumns={tableColumns}
    >
      <Box ref={hostRef} onPointerEnter={hold} onPointerLeave={release} onFocus={hold} onBlur={release}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="baseline" spacing={1.5}>
            <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {frame ? shortDate(frame.day) : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              night {Math.min(index + 1, model.frames.length)} of {model.frames.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Typography variant="caption" sx={{ color: colors.drop, fontVariantNumeric: "tabular-nums" }}>
              ▼ {(frame?.cheaper ?? 0).toLocaleString()} cheaper
            </Typography>
            <Typography variant="caption" sx={{ color: colors.rise, fontVariantNumeric: "tabular-nums" }}>
              ▲ {(frame?.dearer ?? 0).toLocaleString()} dearer
            </Typography>
          </Stack>
        </Stack>

        <Box ref={measureRef} sx={{ width: "100%" }}>
          <Box component="svg" role="img" aria-label={caption} width={width} height={height}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" x2="1">
                <stop offset="0%" stopColor={colors.drop} />
                <stop offset="50%" stopColor={colors.neutralSoft} />
                <stop offset="100%" stopColor={colors.rise} />
              </linearGradient>
            </defs>

            {monthMarks.map((mark) => (
              <text
                key={mark.week}
                x={ROW_LABEL_WIDTH_PX + mark.at * cellWidth}
                y={MONTH_LABEL_HEIGHT_PX - 8}
                fill={colors.muted}
                fontSize={11}
              >
                {mark.label}
              </text>
            ))}

            <g
              opacity={resting ? 0 : 1}
              style={reduced ? undefined : { transition: `opacity ${REST_FADE_MS}ms linear` }}
            >
              {model.resorts.map((resort, row) => {
                const y = MONTH_LABEL_HEIGHT_PX + row * ROW_HEIGHT_PX;
                const bestWeek = bestWeeks.get(resort);
                const bestColumn = bestWeek ? model.weeks.indexOf(bestWeek) : -1;
                return (
                  <g key={resort}>
                    <text
                      x={ROW_LABEL_WIDTH_PX - 12}
                      y={y + ROW_HEIGHT_PX / 2}
                      dy="0.32em"
                      textAnchor="end"
                      fill={colors.ink}
                      fontSize={12}
                    >
                      {resort}
                    </text>
                    {model.weeks.map((week, column) => {
                      const price = frame?.best.get(cellKey(resort, week));
                      return (
                        <rect
                          key={week}
                          x={ROW_LABEL_WIDTH_PX + column * cellWidth + CELL_GAP_PX / 2}
                          y={y + CELL_GAP_PX}
                          width={Math.max(cellWidth - CELL_GAP_PX, 1)}
                          height={ROW_HEIGHT_PX - CELL_GAP_PX * 2}
                          rx={CELL_RADIUS_PX}
                          fill={price === undefined ? "none" : level(price)}
                          stroke={colors.grid}
                          strokeWidth={price === undefined ? 1 : 0.75}
                          strokeDasharray={price === undefined ? "2 3" : undefined}
                          style={cellTransition ? { transition: cellTransition } : undefined}
                        />
                      );
                    })}
                    {bestColumn >= 0 && (
                      <g
                        style={{
                          transform: `translateX(${ROW_LABEL_WIDTH_PX + bestColumn * cellWidth + cellWidth / 2}px)`,
                          transition: reduced ? undefined : `transform ${NIGHT_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                        }}
                      >
                        <circle
                          cx={0}
                          cy={y + ROW_HEIGHT_PX / 2}
                          r={BEST_WEEK_DOT_RADIUS_PX}
                          fill={colors.surface}
                          stroke={colors.ink}
                          strokeWidth={1.2}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            <rect
              x={ROW_LABEL_WIDTH_PX}
              y={height - LEGEND_HEIGHT_PX + 6}
              width={140}
              height={8}
              rx={4}
              fill={`url(#${GRADIENT_ID})`}
            />
            <text x={ROW_LABEL_WIDTH_PX + 150} y={height - LEGEND_HEIGHT_PX + 10} dy="0.32em" fill={colors.muted} fontSize={11}>
              {`${eur(Math.round(model.low))} to ${eur(Math.round(model.high))} a week for two · ○ marks each resort's cheapest week`}
            </text>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {reduced
            ? "Motion is off, so this shows the most recent night."
            : "Replays every collected night, on a loop. Point at it to hold it still."}
        </Typography>
      </Box>
    </ChartCard>
  );
};
