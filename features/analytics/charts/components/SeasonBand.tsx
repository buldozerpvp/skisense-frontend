"use client";

import { useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max as d3max } from "d3-array";
import { area, line, curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeft } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { ChartTooltip, type TooltipState } from "@/shared/charts/components/ChartTooltip";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useAnimatedPath } from "@/shared/charts/hooks/useAnimatedPath";
import { useChartColors } from "@/shared/charts/lib/palette";
import { COLORS } from "@/shared/design/tokens";
import { bidi, dateValue, eur, monthLabel, shortDate } from "@/shared/format/formatters";
import { getBrand } from "@/features/brands/constants";
import type { SeasonWeek } from "@/features/analytics/lib/homeModel";

const MARGIN = { top: 28, right: 20, bottom: 50, left: 62 };
const HEIGHT = 320;

interface BandPoint {
  x: number;
  yTop: number;
  yBottom: number;
}

interface XY {
  x: number;
  y: number;
}

export const SeasonBand = ({ weeks, isFetching }: { weeks: SeasonWeek[]; isFetching: boolean }) => {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(760);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { xScale, yScale, bandPoints, linePoints, cheapestWeek, peakWeek, hitPoints } = useMemo(() => {
    const dates = weeks.map((w) => dateValue(w.weekStart));
    const [minDate = 0, maxDate = 1] = extent(dates);
    const top = d3max(weeks, (w) => w.cheapestPerNight) ?? 1;

    const x = scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);
    const y = scaleLinear().domain([0, top * 1.08]).range([innerHeight, 0]).nice();

    const band: BandPoint[] = weeks.map((w) => ({
      x: x(dateValue(w.weekStart)),
      yTop: y(w.cheapestPerNight),
      yBottom: innerHeight,
    }));

    const cheapest = weeks.reduce<SeasonWeek | null>(
      (best, w) => (!best || w.cheapestPerNight < best.cheapestPerNight ? w : best),
      null
    );
    const peak = weeks.reduce<SeasonWeek | null>(
      (worst, w) => (!worst || w.cheapestPerNight > worst.cheapestPerNight ? w : worst),
      null
    );

    return {
      xScale: x,
      yScale: y,
      bandPoints: band,
      linePoints: band.map((p) => ({ x: p.x, y: p.yTop })),
      cheapestWeek: cheapest,
      peakWeek: peak,
      hitPoints: weeks.map((w, i) => ({ week: w, x: band[i].x, y: band[i].yTop })),
    };
  }, [weeks, innerWidth, innerHeight]);

  const buildBand = useMemo(
    () => (points: BandPoint[]) =>
      area<BandPoint>()
        .x((d) => d.x)
        .y0((d) => d.yBottom)
        .y1((d) => d.yTop)
        .curve(curveMonotoneX)(points) ?? "",
    []
  );
  const buildLine = useMemo(
    () => (points: XY[]) =>
      line<XY>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(curveMonotoneX)(points) ?? "",
    []
  );

  const seedBand = useMemo(
    () => (points: BandPoint[]) => points.map((p) => ({ ...p, yTop: p.yBottom })),
    []
  );
  const seedLine = useMemo(
    () => (points: XY[]) => points.map((p) => ({ x: p.x, y: innerHeight })),
    [innerHeight]
  );

  const bandPath = useAnimatedPath<BandPoint>(bandPoints, buildBand, lerpBand, { seed: seedBand });
  const linePath = useAnimatedPath<XY>(linePoints, buildLine, lerpXY, { seed: seedLine });

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const mx = event.clientX - bounds.left - MARGIN.left;

    let best: (typeof hitPoints)[number] | null = null;
    let bestDistance = Infinity;
    for (const point of hitPoints) {
      const distance = Math.abs(point.x - mx);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }
    if (!best) {
      setTooltip(null);
      return;
    }

    const { week } = best;
    setTooltip({
      x: best.x + MARGIN.left,
      y: best.y + MARGIN.top,
      content: (
        <>
          <strong>Week of {shortDate(week.weekStart)}</strong>
          <br />
          Cheapest: <strong>{eur(week.cheapest.total)}</strong> total · {week.cheapest.nights} nights
          <br />
          {bidi(week.cheapest.resort)} ·{" "}
          {getBrand(week.cheapest.source)?.name ?? week.cheapest.source}
          <br />
          <span style={{ color: colors.inkSecondary }}>
            {eur(week.cheapestPerNight)}/night · cheapest quarter up to{" "}
            {eur(week.budgetPerNight)}/night · {week.n} offers
          </span>
        </>
      ),
    });
  };

  const tableColumns: TableColumn<SeasonWeek>[] = [
    { header: "Week of", render: (w) => shortDate(w.weekStart) },
    { header: "Cheapest resort", render: (w) => w.cheapest.resort },
    { header: "Operator", render: (w) => getBrand(w.cheapest.source)?.name ?? w.cheapest.source },
    { header: "Nights", numeric: true, render: (w) => w.cheapest.nights },
    { header: "Cheapest total", numeric: true, render: (w) => eur(w.cheapest.total) },
    { header: "Per night", numeric: true, render: (w) => eur(w.cheapestPerNight) },
    { header: "Budget ceiling / night", numeric: true, render: (w) => eur(w.budgetPerNight) },
    { header: "Typical / night", numeric: true, render: (w) => eur(w.typicalPerNight) },
    { header: "Offers", numeric: true, render: (w) => w.n },
  ];

  const cheapestX = cheapestWeek ? xScale(dateValue(cheapestWeek.weekStart)) : 0;
  const cheapestLabel =
    cheapestX < innerWidth - 230
      ? { x: cheapestX + 14, anchor: "start" as const }
      : { x: cheapestX - 14, anchor: "end" as const };
  const cheapestY = cheapestWeek ? yScale(cheapestWeek.cheapestPerNight) : 0;
  const peakX = peakWeek ? xScale(dateValue(peakWeek.weekStart)) : 0;
  const peakLabel = anchorFor(peakX, innerWidth, 86);
  const peakY = peakWeek ? yScale(peakWeek.cheapestPerNight) : 0;

  return (
    <ChartCard
      title="When in the season to go"
      subtitle="Departure week along the bottom. The line is the cheapest booking leaving that week; priced per night on the whole booking. Hover any week for what a typical booking there costs."
      isEmpty={weeks.length < 2}
      emptyMessage="Not enough departures to draw a season yet."
      isFetching={isFetching}
      tableRows={weeks}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Price by departure week, ${weeks.length} weeks`}
        >
          <defs>
            <linearGradient id="season-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.sky} stopOpacity={0.26} />
              <stop offset="100%" stopColor={COLORS.ice} stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeft scale={yScale} width={innerWidth} tickCount={4} format={(v) => `${eur(v)}/n`} />

            <motion.path d={bandPath} fill="url(#season-band)" stroke="none" />
            <motion.path
              d={linePath}
              fill="none"
              stroke={colors.brand}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {peakWeek && (
              <g>
                <circle cx={peakX} cy={peakY} r={4} fill={colors.inkSecondary} />
                <text
                  x={peakLabel.x}
                  y={Math.max(peakY - 12, 12)}
                  textAnchor={peakLabel.anchor}
                  fontSize={11.5}
                  fontWeight={600}
                  fill={colors.inkSecondary}
                  stroke={colors.surface}
                  strokeWidth={3.5}
                  paintOrder="stroke"
                >
                  priciest week · {eur(peakWeek.cheapestPerNight)}/night
                </text>
              </g>
            )}

            {cheapestWeek && (
              <g>
                <line
                  x1={cheapestX}
                  x2={cheapestX}
                  y1={cheapestY}
                  y2={innerHeight}
                  stroke={COLORS.accent}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={cheapestX}
                  cy={cheapestY}
                  r={6.5}
                  fill={COLORS.accent}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
                <text
                  x={cheapestLabel.x}
                  y={cheapestY - 26}
                  textAnchor={cheapestLabel.anchor}
                  fontSize={12.5}
                  fontWeight={800}
                  fill={COLORS.accent}
                  stroke={colors.surface}
                  strokeWidth={3.5}
                  paintOrder="stroke"
                >
                  cheapest week · {eur(cheapestWeek.cheapest.total)} total
                </text>
                <text
                  x={cheapestLabel.x}
                  y={cheapestY - 11}
                  textAnchor={cheapestLabel.anchor}
                  fontSize={11}
                  fill={colors.inkSecondary}
                  stroke={colors.surface}
                  strokeWidth={3.5}
                  paintOrder="stroke"
                >
                  {bidi(cheapestWeek.cheapest.resort)}, {cheapestWeek.cheapest.nights} nights from{" "}
                  {shortDate(cheapestWeek.cheapest.departure)}
                </text>
              </g>
            )}

            <AxisBottom
              scale={xScale}
              width={innerWidth}
              y={innerHeight}
              tickCount={innerWidth < 420 ? 3 : 6}
              format={((v: Date) => monthLabel(v.toISOString().slice(0, 10))) as never}
              label="Departure week"
            />

            <rect
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setTooltip(null)}
            />
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
};

const anchorFor = (x: number, innerWidth: number, halfWidth: number) => {
  if (x < halfWidth) return { x: 0, anchor: "start" as const };
  if (x > innerWidth - halfWidth) return { x: innerWidth, anchor: "end" as const };
  return { x, anchor: "middle" as const };
};

const lerpXY = (a: XY, b: XY, t: number): XY => {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};

const lerpBand = (a: BandPoint, b: BandPoint, t: number): BandPoint => {
  return {
    x: a.x + (b.x - a.x) * t,
    yTop: a.yTop + (b.yTop - a.yTop) * t,
    yBottom: a.yBottom + (b.yBottom - a.yBottom) * t,
  };
};
