"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { scaleLinear, scalePoint, scaleSymlog } from "d3-scale";
import { area, line, curveLinear } from "d3-shape";
import { motion } from "framer-motion";
import { AxisBottom } from "./primitives/Axes";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useAnimatedPath } from "@/lib/charts/useAnimatedPath";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { CHART_COLORS } from "@/lib/charts/palette";
import { getBrand } from "@/lib/brands/config";
import {
  bundleD,
  buildJourney,
  journeySignature,
  singleD,
  type JourneyPath,
} from "@/lib/analytics/journey";
import type { OfferKey, SeriesIndex } from "@/lib/analytics/types";
import { bidi, eur, eurDelta, pct, shortDate, trendGlyph, truncateLabel } from "@/lib/analytics/format";

const MARGIN = { top: 26, right: 192, bottom: 46, left: 58 };
const DEFAULT_HEIGHT = 420;
/** Minimum vertical gap between two right-edge labels. Each label is two
 *  lines, so this is line height plus breathing room. */
const LABEL_GAP = 28;
/** How far the pointer may be from a thread before the hover gives up. */
const HOVER_RADIUS = 34;

interface BandPoint {
  x: number;
  /** 10th percentile. */
  lo: number;
  /** 90th percentile. */
  hi: number;
  /** 25th and 75th — the inner band. */
  innerLo: number;
  innerHi: number;
}

interface SpinePoint {
  x: number;
  y: number;
}

interface HitPoint {
  x: number;
  y: number;
  path: JourneyPath;
}

export interface PriceJourneyProps {
  /** The whole tracked history. Slice it upstream to rewind the chart. */
  index: SeriesIndex;
  isFetching: boolean;
  height?: number;
  /** How many movers get their own stroke; the rest are bundled. See the
   *  drawing budget in the comment below. */
  spotlightCount?: number;
  /** Fired when a thread is clicked, so the page can scope other views to it. */
  onSelect?: (key: OfferKey) => void;
}

/**
 * The price journey: every tracked week's path from the night we first saw it
 * to tonight.
 *
 * Form — a fan of individual threads over a percentile band. Each thread is one
 * offer's own price change against its own starting price, so a €900 week and a
 * €9,000 week share an axis and the zero line means "nothing has happened". The
 * band behind them is the 10th-to-90th percentile of those changes each night:
 * it says where the bulk of the market sat while the threads say what happened
 * to any one holiday. Every offer starts at zero on the night it joined, so the
 * picture opens out of a single point and widens — which is exactly the shape
 * of what we know.
 *
 * Why not the alternatives. A stream or stacked area would imply the sum of
 * these packages is a quantity, and a sold-out week would read as a price
 * collapse rather than a disappearance. A violin per night shows the spread but
 * loses the thread — you can't follow one holiday through it, and following one
 * holiday is the thing a reader actually wants. Absolute price on the y axis
 * buries every move inside the spread between resorts.
 *
 * Honesty rules kept here: straight segments only (we look once a night, so
 * there is no curve to draw between checks), observed nights marked on the
 * spine, offers that sold out simply stop and get a hollow end dot instead of
 * being drawn to zero, and the y scale is symmetric about zero so a −8% and a
 * +8% are mirror distances.
 *
 * Drawing budget at ~700 offers: five framer-motion elements in total (the
 * reveal mask, the two percentile bands, the median spine, the label group).
 * The quiet cloud is one path, the bundled movers are two more, and the 60
 * spotlight movers are plain SVG with a CSS transition — about 70 paths in the
 * data layer, not 700 animated components.
 */
export function PriceJourney({
  index,
  isFetching,
  height = DEFAULT_HEIGHT,
  spotlightCount,
  onSelect,
}: PriceJourneyProps) {
  const { ref, width } = useChartDimensions(760);
  const { draw, move } = useChartMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<JourneyPath | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 10);

  // Spreading `{ spotlightCount }` straight into the options would overwrite the
  // default with `undefined` and silently draw all ~430 movers individually.
  const journey = useMemo(
    () => buildJourney(index, spotlightCount === undefined ? {} : { spotlightCount }),
    [index, spotlightCount]
  );
  const { days, counts, dayStats } = journey;
  const enoughDays = days.length >= 2;

  const geometry = useMemo(() => {
    const xScale = scalePoint<string>().domain(days).range([0, innerWidth]).padding(0.08);
    const xAt = (dayIndex: number) => xScale(days[dayIndex] ?? days[0]) ?? 0;

    // Symmetric log: the middle 80% of moves sit inside ±8% while the extremes
    // reach ±60%, so a linear axis would squash the story into one pixel band.
    // Symlog is near-linear around zero and keeps −x and +x mirror images.
    const bound = Math.max(Math.ceil(journey.maxAbsPct / 5) * 5, 10);
    const yScale = scaleSymlog<number, number>()
      .domain([-bound, bound])
      .range([innerHeight, 0])
      .constant(3);
    const yAt = (value: number) => yScale(value);

    const ticks = [-50, -25, -10, -5, -2, 0, 2, 5, 10, 25, 50].filter((t) => Math.abs(t) <= bound);

    const band: BandPoint[] = dayStats.map((stat) => ({
      x: xAt(stat.dayIndex),
      lo: yAt(stat.p10),
      hi: yAt(stat.p90),
      innerLo: yAt(stat.p25),
      innerHi: yAt(stat.p75),
    }));
    const spine: SpinePoint[] = dayStats.map((stat) => ({
      x: xAt(stat.dayIndex),
      y: yAt(stat.median),
    }));

    // One flat list of every observation, for nearest-thread hovering. ~2k
    // entries at today's volume — a linear scan per mousemove is nothing.
    const hits: HitPoint[] = [];
    for (const path of journey.paths) {
      for (const point of path.points) {
        hits.push({ x: xAt(point.dayIndex), y: yAt(point.pct), path });
      }
    }

    // Right-edge labels, pushed apart so two drops of the same size don't print
    // on top of each other.
    const placed = journey.labelled
      .map((path) => {
        const last = path.points[path.points.length - 1];
        return { path, x: xAt(last.dayIndex), y: yAt(last.pct), labelY: yAt(last.pct) };
      })
      .sort((a, b) => a.labelY - b.labelY);
    // Push apart downwards, then slide the whole stack back inside the plot and
    // push apart downwards once more, so neither end can fall off the chart.
    const top = 8;
    const bottom = innerHeight - 22;
    for (let i = 1; i < placed.length; i += 1) {
      placed[i].labelY = Math.max(placed[i].labelY, placed[i - 1].labelY + LABEL_GAP);
    }
    const overflow = placed.length > 0 ? placed[placed.length - 1].labelY - bottom : 0;
    if (overflow > 0) for (const item of placed) item.labelY -= overflow;
    for (let i = 0; i < placed.length; i += 1) {
      const floor = i === 0 ? top : placed[i - 1].labelY + LABEL_GAP;
      placed[i].labelY = Math.max(placed[i].labelY, floor);
    }

    return {
      xScale,
      xAt,
      yAt,
      ticks,
      band,
      spine,
      hits,
      labels: placed,
      cloudD: bundleD(journey.flat, xAt, yAt),
      dropD: bundleD(
        journey.bulk.filter((p) => p.direction === "drop"),
        xAt,
        yAt
      ),
      riseD: bundleD(
        journey.bulk.filter((p) => p.direction === "rise"),
        xAt,
        yAt
      ),
      zeroY: yAt(0),
      /** The right-hand end of the band and spine, for their direct labels. */
      lastStat: dayStats[dayStats.length - 1],
    };
  }, [days, dayStats, journey, innerWidth, innerHeight]);

  const buildBand = useMemo(
    () => (points: BandPoint[]) =>
      area<BandPoint>()
        .x((d) => d.x)
        .y0((d) => d.lo)
        .y1((d) => d.hi)
        .curve(curveLinear)(points) ?? "",
    []
  );
  const buildInnerBand = useMemo(
    () => (points: BandPoint[]) =>
      area<BandPoint>()
        .x((d) => d.x)
        .y0((d) => d.innerLo)
        .y1((d) => d.innerHi)
        .curve(curveLinear)(points) ?? "",
    []
  );
  const buildSpine = useMemo(
    () => (points: SpinePoint[]) =>
      line<SpinePoint>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(curveLinear)(points) ?? "",
    []
  );

  const zeroY = geometry.zeroY;
  const seedBand = useMemo(
    () => (points: BandPoint[]) =>
      points.map((p) => ({ x: p.x, lo: zeroY, hi: zeroY, innerLo: zeroY, innerHi: zeroY })),
    [zeroY]
  );
  const bandPath = useAnimatedPath<BandPoint>(geometry.band, buildBand, lerpBand, { seed: seedBand });
  const innerBandPath = useAnimatedPath<BandPoint>(geometry.band, buildInnerBand, lerpBand, {
    seed: seedBand,
  });
  const spinePath = useAnimatedPath<SpinePoint>(geometry.spine, buildSpine, lerpSpine, {
    seed: (points) => points.map((p) => ({ x: p.x, y: zeroY })),
  });

  // Remounting the mask is what makes the reveal replay when the data changes —
  // framer's `initial` runs once per mount and nothing else.
  const signature = journeySignature(journey);

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const mx = event.clientX - bounds.left - MARGIN.left;
    const my = event.clientY - bounds.top - MARGIN.top;

    let best: HitPoint | null = null;
    let bestDistance = Infinity;
    for (const hit of geometry.hits) {
      const distance = (hit.x - mx) ** 2 + (hit.y - my) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = hit;
      }
    }
    if (!best || bestDistance > HOVER_RADIUS ** 2) {
      setHovered(null);
      setTooltip(null);
      return;
    }

    const path = best.path;
    setHovered(path);
    setTooltip({
      x: best.x + MARGIN.left,
      y: best.y + MARGIN.top,
      content: (
        <>
          <strong>{bidi(path.resort)}</strong>
          <br />
          Departs {shortDate(path.departure)} · {bidi(path.country)}
          <br />
          {getBrand(path.source)?.name ?? path.source}
          {path.nights ? ` · ${path.nights} nights` : ""}
          <br />
          {eur(path.firstPrice)} on {shortDate(path.firstDay)} → <strong>{eur(path.lastPrice)}</strong>
          <br />
          <span style={{ color: colorFor(path) }}>
            {trendGlyph(path.netEur)} {eurDelta(path.netEur)} ({pct(path.netPct)})
          </span>
          {path.gone && (
            <>
              <br />
              <span style={{ color: CHART_COLORS.inkSecondary }}>
                Gone since {shortDate(path.lastDay)} — sold out or withdrawn
              </span>
            </>
          )}
        </>
      ),
    });
  }

  const tableColumns: TableColumn<JourneyPath>[] = [
    { header: "Resort", render: (p) => p.resort },
    { header: "Departure", render: (p) => shortDate(p.departure) },
    { header: "Operator", render: (p) => getBrand(p.source)?.name ?? p.source },
    { header: "First seen", render: (p) => shortDate(p.firstDay) },
    { header: "Was", numeric: true, render: (p) => eur(p.firstPrice) },
    { header: "Now", numeric: true, render: (p) => eur(p.lastPrice) },
    { header: "Change", numeric: true, render: (p) => `${trendGlyph(p.netEur)} ${eurDelta(p.netEur)}` },
    { header: "%", numeric: true, render: (p) => pct(p.netPct) },
    { header: "Still listed", render: (p) => (p.gone ? `No, since ${shortDate(p.lastDay)}` : "Yes") },
  ];

  const subtitle = enoughDays
    ? `${counts.tracked} weeks tracked across ${days.length} nightly checks. Each thread is one week's price measured against what it cost the night we first saw it — down is cheaper, up is pricier. The pale band holds the middle 80% of them, its core the middle half. ${counts.cheaper} got cheaper, ${counts.pricier} got pricier, ${counts.unchanged} haven't moved.`
    : "One price check so far.";

  return (
    <ChartCard
      title="The journey prices have taken"
      subtitle={subtitle}
      isEmpty={!enoughDays || journey.paths.length === 0}
      emptyMessage={
        days.length < 2
          ? "Only one price check so far — the journey starts after tonight's check."
          : "Nothing has been tracked across two nights yet."
      }
      isFetching={isFetching}
      tableRows={journey.paths}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          // The drawing is laid out in the measured width, then fitted to
          // whatever the card actually gives it: centred when there is room to
          // spare, scaled down rather than clipped when the card is narrow, so
          // the right-hand labels survive at 700px and below.
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Price change since first seen for ${counts.tracked} offers across ${days.length} snapshot nights`}
        >
          <defs>
            {/* The reveal: everything is drawn once and uncovered left to right,
                so 700 threads cost one animation instead of 700. */}
            <clipPath id={clipId}>
              <motion.rect
                key={signature}
                x={0}
                y={-MARGIN.top}
                height={innerHeight + MARGIN.top + MARGIN.bottom}
                initial={{ width: 0 }}
                animate={{ width: innerWidth + MARGIN.right }}
                transition={draw()}
              />
            </clipPath>
          </defs>

          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* Frame: gridlines, the zero line and the axis never animate — if
                the ruler moved with the marks nothing would be measurable.
                Hand-rolled rather than AxisLeft because a symlog axis needs
                chosen ticks, not generated ones. */}
            {geometry.ticks.map((tick) => (
              <g key={tick} transform={`translate(0, ${geometry.yAt(tick)})`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  stroke={tick === 0 ? CHART_COLORS.axis : CHART_COLORS.grid}
                  strokeWidth={1}
                />
                <text
                  x={-8}
                  dy="0.32em"
                  textAnchor="end"
                  fill={tick === 0 ? CHART_COLORS.inkSecondary : CHART_COLORS.muted}
                  fontSize={11}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {tick === 0 ? "same" : `${tick > 0 ? "+" : "−"}${Math.abs(tick)}%`}
                </text>
              </g>
            ))}
            <text x={0} y={-10} fontSize={11} fill={CHART_COLORS.muted}>
              change since we first saw the price
            </text>

            <g clipPath={`url(#${clipId})`}>
              {/* The quiet majority: one path, so it reads as texture and costs
                  one element. */}
              <path
                d={geometry.cloudD}
                fill="none"
                stroke={CHART_COLORS.neutral}
                strokeWidth={0.8}
                strokeOpacity={0.12}
                strokeLinecap="round"
              />

              {/* Movers past the spotlight, bundled per direction. Colour is set
                  per bundle and never tweened — the diverging scale runs through
                  neutral, so a tween would read as "no change" halfway. */}
              <path
                d={geometry.dropD}
                fill="none"
                stroke={CHART_COLORS.drop}
                strokeWidth={0.9}
                strokeOpacity={0.14}
                strokeLinecap="round"
              />
              <path
                d={geometry.riseD}
                fill="none"
                stroke={CHART_COLORS.rise}
                strokeWidth={0.9}
                strokeOpacity={0.14}
                strokeLinecap="round"
              />

              {/* Where the market sat each night: the outer shape holds the
                  middle 80% of all changes, the darker core the middle half. A
                  percentile range, never a sum — these packages don't add up to
                  anything. Drawn over the crowd rather than under it: a fill
                  behind hundreds of threads is invisible, while a veil in front
                  quiets the dense middle and leaves the outliers crisp. */}
              <motion.path d={bandPath} fill={CHART_COLORS.neutralSoft} opacity={0.5} stroke="none" />
              <motion.path d={innerBandPath} fill={CHART_COLORS.neutralSoft} opacity={0.5} stroke="none" />

              {/* The biggest movers, individually so each can be hovered and
                  lifted. Plain SVG: a CSS transition carries any reposition. */}
              {journey.spotlight.map((path) => (
                <path
                  key={path.key}
                  d={singleD(path, geometry.xAt, geometry.yAt)}
                  fill="none"
                  stroke={colorFor(path)}
                  strokeWidth={1.3}
                  strokeOpacity={hovered && hovered.key !== path.key ? 0.18 : 0.8}
                  strokeLinecap="round"
                  style={{ transition: "stroke-opacity 120ms linear" }}
                />
              ))}

              {/* Median of every change — the one line that answers "and overall?" */}
              <motion.path
                d={spinePath}
                fill="none"
                stroke={CHART_COLORS.brand}
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* Direct labels on the frame of the picture, so there is no
                  legend to look up. A surface-coloured halo keeps them legible
                  where threads run underneath. */}
              {geometry.lastStat && (
                <g style={{ paintOrder: "stroke" }}>
                  <text
                    x={geometry.xAt(geometry.lastStat.dayIndex) - 10}
                    y={geometry.yAt(geometry.lastStat.p90) - 7}
                    textAnchor="end"
                    fontSize={11}
                    fill={CHART_COLORS.inkSecondary}
                    stroke={CHART_COLORS.surface}
                    strokeWidth={3}
                  >
                    middle 80% of weeks
                  </text>
                  <text
                    x={geometry.xAt(geometry.lastStat.dayIndex) - 10}
                    y={geometry.yAt(geometry.lastStat.median) - 8}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight={600}
                    fill={CHART_COLORS.brand}
                    stroke={CHART_COLORS.surface}
                    strokeWidth={3}
                  >
                    typical week {pct(geometry.lastStat.median)}
                  </text>
                </g>
              )}

              {/* The nights we actually looked. Without these the spine implies
                  a continuous reading. */}
              {geometry.spine.map((point, i) => (
                <circle
                  key={days[i]}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill={CHART_COLORS.brand}
                  stroke={CHART_COLORS.surface}
                  strokeWidth={1.5}
                />
              ))}

              {hovered && (
                <g>
                  <path
                    d={singleD(hovered, geometry.xAt, geometry.yAt)}
                    fill="none"
                    stroke={colorFor(hovered)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  {hovered.points.map((point) => (
                    <circle
                      key={point.day}
                      cx={geometry.xAt(point.dayIndex)}
                      cy={geometry.yAt(point.pct)}
                      r={3.5}
                      fill={colorFor(hovered)}
                      stroke={CHART_COLORS.surface}
                      strokeWidth={1.5}
                    />
                  ))}
                </g>
              )}

              {/* Direct labels instead of a legend: the few journeys worth
                  naming, named where they end. */}
              <motion.g
                key={signature}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={move(0.25)}
              >
                {geometry.labels.map(({ path, x, y, labelY }) => (
                  <g key={path.key}>
                    <path
                      d={`M${x + 5},${y}L${x + 13},${labelY}L${innerWidth + 6},${labelY}`}
                      fill="none"
                      stroke={CHART_COLORS.grid}
                      strokeWidth={1}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={4}
                      // Hollow means the week is no longer on sale — the journey
                      // ended rather than the price going to zero.
                      fill={path.gone ? CHART_COLORS.surface : colorFor(path)}
                      stroke={path.gone ? colorFor(path) : CHART_COLORS.surface}
                      strokeWidth={1.6}
                    />
                    <text
                      x={innerWidth + 10}
                      y={labelY}
                      dy="0.32em"
                      fontSize={11}
                      fill={CHART_COLORS.ink}
                    >
                      {truncateLabel(bidi(path.resort), 14)} {shortDate(path.departure)}
                    </text>
                    <text
                      x={innerWidth + 10}
                      y={labelY + 12}
                      dy="0.32em"
                      fontSize={11}
                      fontWeight={600}
                      fill={colorFor(path)}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {trendGlyph(path.netEur)} {eurDelta(path.netEur)} · {pct(path.netPct, 0)}
                    </text>
                  </g>
                ))}
              </motion.g>
            </g>

            <AxisBottom
              scale={scaleLinear().domain([0, 1]).range([0, innerWidth])}
              width={innerWidth}
              y={innerHeight}
              tickCount={0}
              format={(() => "") as never}
            />
            {days.map((day, i) => (
              <text
                key={day}
                x={geometry.xAt(i)}
                y={innerHeight + 17}
                textAnchor="middle"
                fontSize={11}
                fontWeight={i === days.length - 1 ? 600 : 400}
                fill={i === days.length - 1 ? CHART_COLORS.inkSecondary : CHART_COLORS.muted}
              >
                {i === days.length - 1 ? `${shortDate(day)} · tonight` : shortDate(day)}
              </text>
            ))}

            <rect
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => {
                setHovered(null);
                setTooltip(null);
              }}
              onClick={() => hovered && onSelect?.(hovered.key)}
            />
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
}

/** Aqua for cheaper, red for pricier, grey for a journey that went nowhere. */
function colorFor(path: JourneyPath): string {
  if (path.direction === "flat") return CHART_COLORS.neutral;
  return path.direction === "drop" ? CHART_COLORS.drop : CHART_COLORS.rise;
}

function lerpBand(a: BandPoint, b: BandPoint, t: number): BandPoint {
  const mix = (from: number, to: number) => from + (to - from) * t;
  return {
    x: mix(a.x, b.x),
    lo: mix(a.lo, b.lo),
    hi: mix(a.hi, b.hi),
    innerLo: mix(a.innerLo, b.innerLo),
    innerHi: mix(a.innerHi, b.innerHi),
  };
}

function lerpSpine(a: SpinePoint, b: SpinePoint, t: number): SpinePoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
