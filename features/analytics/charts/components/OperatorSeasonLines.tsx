"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { scaleLog, scaleUtc } from "d3-scale";
import { line } from "d3-shape";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeft } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { ChartTooltip, type TooltipState } from "@/shared/charts/components/ChartTooltip";
import { useChartColors } from "@/shared/charts/lib/palette";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useAnimatedPath } from "@/shared/charts/hooks/useAnimatedPath";
import { eur, shortDate } from "@/shared/format/formatters";
import { seasonWeekStarts, type OperatorSeason } from "@/features/analytics/lib/homeModel";
import {
  SEASON_LINES_HEIGHT_PX,
  SEASON_LINES_MARGIN,
  SEASON_DOT_RADIUS_PX,
  SEASON_LINE_WIDTH_PX,
  SEASON_TICK_LADDER,
} from "@/features/analytics/constants";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

interface WeekPoint {
  week: string;
  value: number | null;
}

const atWeek = (season: OperatorSeason, weeks: string[]): WeekPoint[] => {
  const byWeek = new Map(season.weeks.map((week) => [week.weekStart, week.cheapestPerNight]));
  return weeks.map((week) => ({ week, value: byWeek.get(week) ?? null }));
};

const lerpPoint = (from: WeekPoint, to: WeekPoint, t: number): WeekPoint => {
  if (to.value === null) return to;
  if (from.value === null) return to;
  return { week: to.week, value: from.value + (to.value - from.value) * t };
};

const SeasonLine = ({
  season,
  weeks,
  x,
  y,
  faded,
}: {
  season: OperatorSeason;
  weeks: string[];
  x: (week: string) => number;
  y: (value: number) => number;
  faded: boolean;
}) => {
  const points = useMemo(() => atWeek(season, weeks), [season, weeks]);

  const build = useMemo(
    () =>
      (list: WeekPoint[]) =>
        line<WeekPoint>()
          .defined((point) => point.value !== null)
          .x((point) => x(point.week))
          .y((point) => y(point.value ?? 1))(list) ?? "",
    [x, y]
  );

  const path = useAnimatedPath(points, build, lerpPoint);

  return (
    <g opacity={faded ? 0.18 : 1}>
      <motion.path
        d={path}
        fill="none"
        stroke={season.color}
        strokeWidth={SEASON_LINE_WIDTH_PX}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {season.weeks.map((week) => (
        <circle
          key={week.weekStart}
          cx={x(week.weekStart)}
          cy={y(week.cheapestPerNight)}
          r={SEASON_DOT_RADIUS_PX}
          fill={season.color}
        />
      ))}
    </g>
  );
};

export const OperatorSeasonLines = ({
  seasons,
  isFetching,
}: {
  seasons: OperatorSeason[];
  isFetching: boolean;
}) => {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(760);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const innerWidth = Math.max(width - SEASON_LINES_MARGIN.left - SEASON_LINES_MARGIN.right, 10);
  const innerHeight = SEASON_LINES_HEIGHT_PX - SEASON_LINES_MARGIN.top - SEASON_LINES_MARGIN.bottom;

  const weeks = useMemo(() => seasonWeekStarts(seasons), [seasons]);

  const { time, price, x, y, ticks } = useMemo(() => {
    const values = seasons.flatMap((season) => season.weeks.map((week) => week.cheapestPerNight));
    const low = values.length > 0 ? Math.min(...values) : 1;
    const high = values.length > 0 ? Math.max(...values) : low * 2;
    const first = weeks[0] ?? "2026-01-01";
    const last = weeks[weeks.length - 1] ?? "2026-02-01";
    const timeScale = scaleUtc()
      .domain([new Date(`${first}T00:00:00Z`), new Date(`${last}T00:00:00Z`)])
      .range([0, innerWidth]);
    const priceScale = scaleLog().domain([low * 0.92, high * 1.08]).range([innerHeight, 0]);
    return {
      time: timeScale,
      price: priceScale,
      x: (week: string) => timeScale(new Date(`${week}T00:00:00Z`)),
      y: (value: number) => priceScale(value),
      ticks: SEASON_TICK_LADDER.filter((tick) => tick >= low * 0.92 && tick <= high * 1.08),
    };
  }, [seasons, weeks, innerWidth, innerHeight]);

  const pickWeek = (offsetX: number): string | null => {
    let best: string | null = null;
    let bestGap = Infinity;
    for (const week of weeks) {
      const gap = Math.abs(x(week) - offsetX);
      if (gap < bestGap) {
        bestGap = gap;
        best = week;
      }
    }
    return best;
  };

  const tableRows = useMemo(
    () =>
      weeks.map((week) => ({
        week,
        prices: seasons.map((season) => ({
          source: season.source,
          brandName: season.brandName,
          value: season.weeks.find((entry) => entry.weekStart === week)?.cheapestPerNight ?? null,
        })),
      })),
    [weeks, seasons]
  );

  const tableColumns: TableColumn<(typeof tableRows)[number]>[] = [
    { header: "Departing week of", render: (row) => shortDate(row.week) },
    ...seasons.map((season) => ({
      header: season.brandName,
      numeric: true,
      render: (row: (typeof tableRows)[number]) => {
        const price = row.prices.find((entry) => entry.source === season.source)?.value ?? null;
        return price === null ? "—" : eur(Math.round(price));
      },
    })),
  ];

  return (
    <ChartCard
      title="When each operator is cheapest"
      subtitle="One line per operator, following the cheapest night it sells for each departure week. Where a line dives is that operator's bargain week; where two cross, the cheapest name in the market changes hands. Priced per night on the whole booking so a long weekend can't look cheap just for being short."
      isEmpty={seasons.length === 0 || weeks.length < 2}
      emptyMessage="Not enough departures collected to draw a season yet"
      isFetching={isFetching}
      tableRows={tableRows}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <Box component="svg" width={width} height={SEASON_LINES_HEIGHT_PX} role="img">
          <g transform={`translate(${SEASON_LINES_MARGIN.left}, ${SEASON_LINES_MARGIN.top})`}>
            <AxisLeft scale={price} width={innerWidth} values={ticks} format={(value) => eur(value)} />
            <AxisBottom
              scale={time}
              width={innerWidth}
              y={innerHeight}
              tickCount={7}
              format={(value) => MONTH.format(value as unknown as Date)}
            />

            {seasons.map((season) => (
              <SeasonLine
                key={season.source}
                season={season}
                weeks={weeks}
                x={x}
                y={y}
                faded={hovered !== null && hovered !== season.source}
              />
            ))}

            <rect
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onMouseLeave={() => setTooltip(null)}
              onMouseMove={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                const week = pickWeek(event.clientX - box.left);
                if (!week) return;
                const quotes = seasons
                  .map((season) => ({
                    season,
                    value: season.weeks.find((entry) => entry.weekStart === week)?.cheapestPerNight ?? null,
                  }))
                  .filter((quote) => quote.value !== null)
                  .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
                setTooltip({
                  x: event.clientX - box.left + SEASON_LINES_MARGIN.left,
                  y: event.clientY - box.top,
                  content: (
                    <Stack spacing={0.5}>
                      <Typography variant="caption" fontWeight={700}>
                        Departing week of {shortDate(week)}
                      </Typography>
                      {quotes.map((quote) => (
                        <Stack key={quote.season.source} direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: quote.season.color }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>
                            {quote.season.brandName}
                          </Typography>
                          <Typography variant="caption" fontWeight={600} className="tabular">
                            {eur(Math.round(quote.value ?? 0))}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ),
                });
              }}
            />
          </g>
        </Box>

        <ChartTooltip tooltip={tooltip} containerWidth={width} />

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          {seasons.map((season) => (
            <Stack
              key={season.source}
              direction="row"
              spacing={0.75}
              alignItems="center"
              onMouseEnter={() => setHovered(season.source)}
              onMouseLeave={() => setHovered(null)}
              sx={{ cursor: "default" }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: season.color }} />
              <Typography variant="caption" sx={{ color: colors.inkSecondary }}>
                {season.brandName}
              </Typography>
              <Typography variant="caption" className="tabular" sx={{ color: colors.muted }}>
                from {eur(Math.round(season.cheapest))}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </ChartCard>
  );
};
