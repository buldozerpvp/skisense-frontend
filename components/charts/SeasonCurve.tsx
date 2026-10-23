"use client";

import { useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, median, quantile } from "d3-array";
import { line, curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { useAnimatedPath } from "@/lib/charts/useAnimatedPath";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { offerKey, type SourcedRow } from "@/lib/analytics/derive";
import { getBrand } from "@/lib/brands/config";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { CHART_COLORS } from "@/lib/charts/palette";
import { bidi, dateValue, eur, monthLabel, shortDate, truncateLabel } from "@/lib/analytics/format";


const MARGIN = { top: 16, right: 24, bottom: 48, left: 64 };
const HEIGHT = 340;
const LABELLED_COUNT = 1;

interface Point {
  /** Stable identity, so a dot tweens to its new position instead of being
   *  recycled for an unrelated offer when the filter changes. */
  key: string;
  row: SourcedRow;
  nights: number;
  /** Price per person per night — the only basis on which 3- and 7-night
   *  packages can share an axis. */
  perNight: number;
  x: number;
  y: number;
  isCheap: boolean;
}

interface XY {
  x: number;
  y: number;
}

/**
 * Every current offer plotted against its departure date, with the cheapest
 * decile pulled forward.
 *
 * Colour alone can't carry "best" at ~700 overlapping points, so cheap offers
 * get size + full opacity + a surface ring, and the rest stay as a faint density
 * cloud — the cloud is the context that makes cheap look cheap.
 */
/**
 * Stay length for a row, falling back to the operator's fixed duration where it
 * has one (Club Med always sells 7 nights). Rows where neither resolves are
 * dropped rather than guessed.
 */
function nightsFor(row: SourcedRow): number | undefined {
  return row.nights ?? getBrand(row.source)?.defaultNights;
}

export function SeasonCurve({ rows, isFetching }: { rows: SourcedRow[]; isFetching: boolean }) {
  const { ref, width } = useChartDimensions(760);
  const { move, stagger } = useChartMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { points, xScale, yScale, medianPoints, medianPrice, cheapThreshold, cheapest, comparable } =
    useMemo(() => {
    // Per night, not per package: a 3-night break and a week are not comparable
    // on total price, and mixing them makes "cheapest 10%" mean "shortest".
    const priced = rows
      .map((row) => ({ row, nights: nightsFor(row) }))
      .filter((r): r is { row: SourcedRow; nights: number } => Boolean(r.nights))
      .map(({ row, nights }) => ({ row, nights, perNight: row.priceEur / nights }));

    const prices = priced.map((r) => r.perNight);
    const dates = priced.map((r) => dateValue(r.row.date));
    const [minDate = 0, maxDate = 1] = extent(dates);
    const [minPrice = 0, maxPrice = 1] = extent(prices);

    const x = scaleTime().domain([minDate, maxDate]).range([0, innerWidth]).nice();
    const y = scaleLinear()
      .domain([Math.max(0, minPrice * 0.9), maxPrice * 1.05])
      .range([innerHeight, 0])
      .nice();

    const threshold = quantile(prices.slice().sort((a, b) => a - b), 0.1) ?? 0;

    const pts: Point[] = priced.map(({ row, nights, perNight }) => ({
      key: offerKey(row.source, row.resortId, row.date, row.nights),
      row,
      nights,
      perNight,
      x: x(dateValue(row.date)),
      y: y(perNight),
      isCheap: perNight <= threshold,
    }));

    // Typical price per departure date — the reference that makes "cheap" mean
    // something.
    const byDate = new Map<string, number[]>();
    for (const point of pts) {
      const bucket = byDate.get(point.row.date);
      if (bucket) bucket.push(point.perNight);
      else byDate.set(point.row.date, [point.perNight]);
    }
    const medianSeries = [...byDate.entries()]
      .map(([date, values]) => ({ date, value: median(values) ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      points: pts,
      xScale: x,
      yScale: y,
      medianPoints: medianSeries.map((d) => ({ x: x(dateValue(d.date)), y: y(d.value) })),
      medianPrice: median(prices) ?? 0,
      cheapThreshold: threshold,
      cheapest: pts.slice().sort((a, b) => a.perNight - b.perNight).slice(0, LABELLED_COUNT),
      comparable: pts.length,
    };
  }, [rows, innerWidth, innerHeight]);

  // The spine morphs to its new shape when the filter changes rather than
  // snapping; `pathLength` can't do that — it only ever plays once.
  const buildMedian = useMemo(
    () =>
      (pts: XY[]) =>
        line<XY>()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(curveMonotoneX)(pts) ?? "",
    []
  );
  const medianPath = useAnimatedPath<XY>(medianPoints, buildMedian, lerpXY, {
    seed: (pts) => pts.map((p) => ({ x: p.x, y: innerHeight })),
  });

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const mx = event.clientX - bounds.left - MARGIN.left;
    const my = event.clientY - bounds.top - MARGIN.top;

    // Nearest-point search: r=2.5 dots are impossible to hit directly, and at
    // ~700 points a linear scan is still trivial per mousemove.
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (const point of points) {
      const distance = (point.x - mx) ** 2 + (point.y - my) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }
    if (!best || bestDistance > 60 ** 2) {
      setTooltip(null);
      return;
    }

    const { row } = best;
    setTooltip({
      x: best.x + MARGIN.left,
      y: best.y + MARGIN.top,
      content: (
        <>
          <strong>{bidi(row.resort)}</strong>
          <br />
          Departs {shortDate(row.date)} · {bidi(row.country)}
          <br />
          {getBrand(row.source)?.name ?? row.source} · {best.nights} nights
          <br />
          <strong>{eur(row.priceEur)}</strong> total ·{" "}
          <strong>{eur(best.perNight)}</strong>/night
          {best.isCheap && (
            <span style={{ color: CHART_COLORS.drop }}> · one of the 10% cheapest</span>
          )}
          {row.status !== "default" && (
            <>
              <br />
              <span style={{ color: CHART_COLORS.inkSecondary }}>
                {getBrand(row.source)?.name ?? "The operator"} calls this{" "}
                {row.status === "green" ? "their best price" : "last rooms"}
              </span>
            </>
          )}
        </>
      ),
    });
  }

  const tableColumns: TableColumn<SourcedRow>[] = [
    { header: "Resort", render: (r) => r.resort },
    { header: "Departure", render: (r) => shortDate(r.date) },
    { header: "Operator", render: (r) => getBrand(r.source)?.name ?? r.source },
    { header: "Nights", numeric: true, render: (r) => r.nights ?? "—" },
    { header: "Price", numeric: true, render: (r) => eur(r.priceEur) },
    {
      header: "Per night",
      numeric: true,
      render: (r) => {
        const nights = nightsFor(r);
        return nights ? eur(r.priceEur / nights) : "—";
      },
    },
  ];

  return (
    <ChartCard
      title="When to go, and what it costs"
      subtitle={`${comparable} departures, priced per person per night so 3-night breaks and full weeks compare. The line is the typical price that week; big aqua dots are the cheapest 10%, under ${eur(cheapThreshold)} a night.`}
      isEmpty={rows.length === 0}
      isFetching={isFetching}
      tableRows={rows.slice().sort((a, b) => a.priceEur - b.priceEur)}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Price by departure date, ${rows.length} offers`}
        >
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeft scale={yScale} width={innerWidth} format={(v) => `${eur(v)}/n`} />

            {/* Reference line, never animated: if the frame moved with the marks,
                nothing on the chart would be measurable. */}
            <line
              x1={0}
              x2={innerWidth}
              y1={yScale(medianPrice)}
              y2={yScale(medianPrice)}
              stroke={CHART_COLORS.muted}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={innerWidth} y={yScale(medianPrice) - 6} textAnchor="end" fontSize={11} fill={CHART_COLORS.muted}>
              typical {eur(medianPrice)}/night
            </text>

            {/* Background density: the cloud that gives "cheap" its context.
                Hundreds of plain circles, moved by a CSS transition on the whole
                layer — individually animating them would mean hundreds of
                framer-motion elements and a visibly janky first paint. */}
            <g>
              {points
                .filter((p) => !p.isCheap)
                .map((p) => (
                  <circle
                    key={p.key}
                    r={2.5}
                    fill={CHART_COLORS.neutral}
                    opacity={0.3}
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px)`,
                      transition: "transform 450ms cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                ))}
            </g>

            <motion.path d={medianPath} fill="none" stroke={CHART_COLORS.brand} strokeWidth={2} />

            {/* The cheapest decile is few enough to animate properly, and it is
                the part the reader is here for. */}
            {points
              .filter((p) => p.isCheap)
              .map((p, i) => (
                <motion.circle
                  key={p.key}
                  initial={{ opacity: 0, scale: 0.4, cx: p.x, cy: p.y }}
                  animate={{ opacity: 1, scale: 1, cx: p.x, cy: p.y }}
                  transition={move(stagger(i))}
                  r={5}
                  fill={CHART_COLORS.drop}
                  stroke={CHART_COLORS.surface}
                  strokeWidth={2}
                />
              ))}

            {/* Exactly one callout: the cheapest offers cluster within a few euros
                of each other, so several labels here would always overprint. The
                rest are reachable through the tooltip and the table view. */}
            {cheapest[0] && (
              <g>
                <circle
                  cx={cheapest[0].x}
                  cy={cheapest[0].y}
                  r={9}
                  fill="none"
                  stroke={CHART_COLORS.drop}
                  strokeWidth={1.5}
                />
                <text
                  x={Math.min(Math.max(cheapest[0].x, 90), innerWidth - 90)}
                  y={cheapest[0].y - 16}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={CHART_COLORS.ink}
                >
                  cheapest · {truncateLabel(bidi(cheapest[0].row.resort), 22)} {eur(cheapest[0].perNight)}/night
                </text>
              </g>
            )}

            <AxisBottom
              scale={xScale}
              width={innerWidth}
              y={innerHeight}
              tickCount={6}
              format={((v: Date) => monthLabel(v.toISOString().slice(0, 10))) as never}
              label="Departure date"
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
}

function lerpXY(a: XY, b: XY, t: number): XY {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
