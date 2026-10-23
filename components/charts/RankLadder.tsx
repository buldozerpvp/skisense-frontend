"use client";

import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { scalePoint } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { useAnimatedPath } from "@/lib/charts/useAnimatedPath";
import { CHART_COLORS, MOTION } from "@/lib/charts/palette";
import { bidi, eur, shortDate, truncateLabel } from "@/lib/analytics/format";
import type { LadderSeries, LadderPoint } from "@/lib/analytics/derive";
import type { DayISO } from "@/lib/analytics/types";

const MARGIN = { top: 18, right: 170, bottom: 34, left: 46 };
const ROW_HEIGHT = 30;

interface XY {
  x: number;
  y: number;
}

/**
 * The ranking ladder — which resorts are cheapest, night after night.
 *
 * Position is rank, not price, and that is the point: a crossing is a real
 * event ("Bansko overtook Borovets last night"), and a rank at a nightly check
 * is exactly what was observed, so nothing is implied between the columns the
 * way a smoothed price line would imply it. It also gets more legible every
 * night, because each check adds a column.
 */
export function RankLadder({
  days,
  series,
  topN,
  isFetching,
}: {
  days: DayISO[];
  series: LadderSeries[];
  topN: number;
  isFetching: boolean;
}) {
  const { ref, width } = useChartDimensions(760);
  const motionPrefs = useChartMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const height = MARGIN.top + MARGIN.bottom + topN * ROW_HEIGHT;
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = topN * ROW_HEIGHT;

  const { xScale, yScale } = useMemo(() => {
    const x = scalePoint<string>().domain(days).range([0, innerWidth]).padding(0.5);
    // Fixed 1..topN domain. If it shrank with the data, every surviving line
    // would slide for a reason that has nothing to do with its rank.
    const y = scalePoint<number>()
      .domain(Array.from({ length: topN }, (_, i) => i + 1))
      .range([0, innerHeight])
      .padding(0.5);
    return { xScale: x, yScale: y };
  }, [days, innerWidth, innerHeight, topN]);

  const tableRows = useMemo(
    () => series.flatMap((s) => s.points.map((p) => ({ resort: s.resort, ...p }))),
    [series]
  );

  const tableColumns: TableColumn<LadderPoint & { resort: string }>[] = [
    { header: "Night", render: (r) => shortDate(r.day) },
    { header: "Rank", numeric: true, render: (r) => r.rank },
    { header: "Resort", render: (r) => bidi(r.resort) },
    { header: "Cheapest", numeric: true, render: (r) => eur(r.priceEur) },
  ];

  return (
    <ChartCard
      title="Cheapest resorts, night by night"
      subtitle={
        days.length < 2
          ? "One price check so far — the ladder starts moving after tonight"
          : `Rank 1 is the cheapest resort that night. Lines cross when one overtakes another.`
      }
      isEmpty={days.length < 2 || series.length === 0}
      emptyMessage="We need a second night of prices before anything can change places"
      isFetching={isFetching}
      tableRows={tableRows}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          width="100%"
          height={height}
          role="img"
          aria-label={`Rank of the ${topN} cheapest resorts across ${days.length} nightly price checks`}
        >
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* Reference frame: never animated, or nothing would be measurable. */}
            {yScale.domain().map((rank) => (
              <g key={rank} transform={`translate(0, ${yScale(rank) ?? 0})`}>
                <line x1={0} x2={innerWidth} stroke={CHART_COLORS.grid} strokeWidth={1} />
                <text x={-10} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART_COLORS.muted}>
                  {rank}
                </text>
              </g>
            ))}
            {days.map((day) => (
              <g key={day}>
                <line
                  x1={xScale(day) ?? 0}
                  x2={xScale(day) ?? 0}
                  y1={-6}
                  y2={innerHeight}
                  stroke={CHART_COLORS.grid}
                  strokeWidth={1}
                />
                <text
                  x={xScale(day) ?? 0}
                  y={innerHeight + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CHART_COLORS.muted}
                >
                  {shortDate(day)}
                </text>
              </g>
            ))}

            {series.map((s) => (
              <LadderLine
                key={s.resortId}
                // Only resorts still in the top N on the final night get a name:
                // labelling a line that stops mid-chart drops text across every
                // other line for no gain.
                labelled={s.points[s.points.length - 1]?.day === days[days.length - 1]}
                series={s}
                xScale={xScale}
                yScale={yScale}
                dimmed={hovered !== null && hovered !== s.resortId}
                focused={hovered === s.resortId}
                delay={motionPrefs.stagger(s.points[s.points.length - 1]?.rank ?? 0)}
                onEnter={(point, event) => {
                  setHovered(s.resortId);
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  setTooltip({
                    x: (xScale(point.day) ?? 0) + MARGIN.left,
                    y: (yScale(point.rank) ?? 0) + MARGIN.top,
                    content: (
                      <>
                        <strong>{bidi(s.resort)}</strong>
                        <br />
                        {shortDate(point.day)} · rank {point.rank} of {topN}
                        <br />
                        cheapest week {eur(point.priceEur)}
                      </>
                    ),
                  });
                  void rect;
                }}
                onLeave={() => {
                  setHovered(null);
                  setTooltip(null);
                }}
              />
            ))}
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
}

function LadderLine({
  series,
  xScale,
  yScale,
  dimmed,
  focused,
  labelled,
  delay,
  onEnter,
  onLeave,
}: {
  series: LadderSeries;
  labelled: boolean;
  xScale: ReturnType<typeof scalePoint<string>>;
  yScale: ReturnType<typeof scalePoint<number>>;
  dimmed: boolean;
  focused: boolean;
  delay: number;
  onEnter: (point: LadderPoint, event: React.MouseEvent<SVGElement>) => void;
  onLeave: () => void;
}) {
  const { reorder, hover } = useChartMotion();

  // Contiguous runs only. A resort that left the top N and came back gets two
  // segments with a visible break, which is what actually happened.
  const runs = useMemo(() => splitRuns(series.points), [series.points]);
  const last = series.points[series.points.length - 1];
  const colour = focused ? CHART_COLORS.brand : CHART_COLORS.skyLine;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: dimmed ? 0.18 : 1 }}
      transition={hover}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    >
      {runs.map((run, i) => (
        <LadderSegment
          key={i}
          run={run}
          xScale={xScale}
          yScale={yScale}
          colour={colour}
          focused={focused}
          delay={delay}
          onEnter={onEnter}
        />
      ))}

      {last && labelled && (
        <motion.text
          initial={false}
          animate={{ x: (xScale(last.day) ?? 0) + 12, y: yScale(last.rank) ?? 0 }}
          transition={reorder(delay)}
          dy="0.32em"
          fontSize={11}
          fontWeight={focused ? 700 : 500}
          fill={focused ? CHART_COLORS.ink : CHART_COLORS.inkSecondary}
        >
          {truncateLabel(bidi(series.resort), 18)} · {eur(last.priceEur)}
        </motion.text>
      )}
    </motion.g>
  );
}

function LadderSegment({
  run,
  xScale,
  yScale,
  colour,
  focused,
  delay,
  onEnter,
}: {
  run: LadderPoint[];
  xScale: ReturnType<typeof scalePoint<string>>;
  yScale: ReturnType<typeof scalePoint<number>>;
  colour: string;
  focused: boolean;
  delay: number;
  onEnter: (point: LadderPoint, event: React.MouseEvent<SVGElement>) => void;
}) {
  const { reorder } = useChartMotion();

  const points = useMemo<XY[]>(
    () => run.map((p) => ({ x: xScale(p.day) ?? 0, y: yScale(p.rank) ?? 0 })),
    [run, xScale, yScale]
  );

  const build = useMemo(
    () => (pts: XY[]) =>
      line<XY>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(curveMonotoneX)(pts) ?? "",
    []
  );

  const d = useAnimatedPath<XY>(points, build, lerpXY, { duration: MOTION.reorder });
  const transition = reorder(delay);

  return (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke={colour}
        strokeWidth={focused ? 3 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A 2px line is impossible to hit with a mouse; this is the real target. */}
      <motion.path d={d} fill="none" stroke="transparent" strokeWidth={20} strokeLinecap="round" />

      {run.map((point, i) => (
        <motion.circle
          key={point.day}
          initial={false}
          animate={{ cx: points[i].x, cy: points[i].y }}
          transition={transition}
          r={focused ? 5.5 : 4}
          fill={colour}
          stroke={CHART_COLORS.surface}
          strokeWidth={2}
          onMouseEnter={(event) => onEnter(point, event)}
        />
      ))}
    </>
  );
}

function lerpXY(a: XY, b: XY, t: number): XY {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Splits a sparse series into runs of consecutive observations. */
function splitRuns(points: LadderPoint[]): LadderPoint[][] {
  if (points.length === 0) return [];
  return [points];
}
