"use client";

import { useMemo, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { scaleLinear, scalePoint } from "d3-scale";
import { extent } from "d3-array";
import { line, curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { CHART_COLORS, MOTION, changeColor } from "@/lib/charts/palette";
import { eur, offerLabel, shortDate, trendGlyph, truncateLabel } from "@/lib/analytics/format";
import type { OfferSeries } from "@/lib/analytics/types";

const MARGIN = { top: 16, right: 150, bottom: 48, left: 64 };
const HEIGHT = 340;

interface Row {
  series: OfferSeries;
  label: string;
  net: number;
  color: string;
  path: string;
  endX: number;
  endY: number;
  /** Label y, nudged apart from its neighbours so end labels never overprint. */
  labelY: number;
}

/**
 * One line per tracked offer across snapshot days.
 *
 * Lines are coloured by direction (cheaper / pricier) rather than by identity —
 * at this width a six-hue categorical scale would spend the colour channel on
 * names the reader doesn't need, when the question is "which way did it go".
 * Identity comes from the label at the end of each line.
 */
export function PriceHistoryLines({
  series,
  days,
  isFetching,
}: {
  series: OfferSeries[];
  days: string[];
  isFetching: boolean;
}) {
  const { ref, width } = useChartDimensions(760);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { rows, xScale, yScale } = useMemo(() => {
    const prices = series.flatMap((s) => s.points.map((p) => p.priceEur));
    const [min = 0, max = 1] = extent(prices);
    const pad = (max - min) * 0.1 || 100;

    const x = scalePoint<string>().domain(days).range([0, innerWidth]).padding(0.5);
    const y = scaleLinear().domain([min - pad, max + pad]).range([innerHeight, 0]).nice();

    const builder = line<{ day: string; priceEur: number }>()
      .x((d) => x(d.day) ?? 0)
      .y((d) => y(d.priceEur))
      .curve(curveMonotoneX);

    const built: Row[] = series.map((s) => {
      const first = s.points[0];
      const last = s.points[s.points.length - 1];
      const net = last.priceEur - first.priceEur;
      const endY = y(last.priceEur);
      return {
        series: s,
        label: offerLabel(s.resort, s.departure),
        net,
        color: changeColor(net),
        path: builder(s.points) ?? "",
        endX: x(last.day) ?? 0,
        endY,
        labelY: endY,
      };
    });

    // Push overlapping end labels apart, top to bottom, then clamp into the plot.
    const MIN_GAP = 14;
    const ordered = [...built].sort((a, b) => a.endY - b.endY);
    let lastY = -Infinity;
    for (const row of ordered) {
      row.labelY = Math.max(row.endY, lastY + MIN_GAP);
      lastY = row.labelY;
    }
    const overflow = lastY - innerHeight;
    if (overflow > 0) for (const row of ordered) row.labelY -= overflow;

    return { rows: built, xScale: x, yScale: y };
  }, [series, days, innerWidth, innerHeight]);

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg || days.length === 0) return;
    const bounds = svg.getBoundingClientRect();
    const mx = event.clientX - bounds.left - MARGIN.left;

    // Snap to the nearest scrape column — the x axis is discrete, so a free
    // crosshair would imply readings between days that don't exist.
    let nearest = days[0];
    let best = Infinity;
    for (const day of days) {
      const distance = Math.abs((xScale(day) ?? 0) - mx);
      if (distance < best) {
        best = distance;
        nearest = day;
      }
    }

    const atDay = rows
      .map((row) => ({ row, point: row.series.points.find((p) => p.day === nearest) }))
      .filter((entry) => entry.point)
      .sort((a, b) => (a.point?.priceEur ?? 0) - (b.point?.priceEur ?? 0));

    setTooltip({
      x: (xScale(nearest) ?? 0) + MARGIN.left,
      y: MARGIN.top + innerHeight / 2,
      content: (
        <>
          <strong>{shortDate(nearest)}</strong>
          {atDay.slice(0, 6).map(({ row, point }) => (
            <Box key={row.series.key} sx={{ mt: 0.25 }}>
              <span style={{ color: row.color }}>■</span> {row.label} — <strong>{eur(point!.priceEur)}</strong>
            </Box>
          ))}
        </>
      ),
    });
  }

  const tableRows = rows.flatMap((row) =>
    row.series.points.map((point) => ({ label: row.label, day: point.day, priceEur: point.priceEur }))
  );

  const tableColumns: TableColumn<{ label: string; day: string; priceEur: number }>[] = [
    { header: "Offer", render: (r) => r.label },
    { header: "Snapshot", render: (r) => shortDate(r.day) },
    { header: "Price", numeric: true, render: (r) => eur(r.priceEur) },
  ];

  return (
    <ChartCard
      title="How these prices have moved"
      subtitle={
        days.length < 2
          ? "One snapshot so far — a trend needs at least two"
          : `${days.length} daily snapshots, ${rows.length} tracked departures`
      }
      isEmpty={rows.length === 0 || days.length < 2}
      emptyMessage="Needs at least two daily snapshots to plot a trend"
      isFetching={isFetching}
      tableRows={tableRows}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        {/* Legend: colour means direction, never identity. */}
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <LegendItem color={CHART_COLORS.drop} glyph={trendGlyph(-1)} label="Got cheaper" />
          <LegendItem color={CHART_COLORS.rise} glyph={trendGlyph(1)} label="Got pricier" />
        </Stack>

        <svg ref={svgRef} width="100%" height={HEIGHT} role="img" aria-label="Price history by snapshot day">
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeft scale={yScale} width={innerWidth} format={(v) => eur(v)} />

            {rows.map((row, i) => {
              const dim = hovered !== null && hovered !== row.series.key;
              return (
                <g
                  key={row.series.key}
                  opacity={dim ? 0.15 : 1}
                  style={{ transition: `opacity ${MOTION.hover}s linear` }}
                  onMouseEnter={() => setHovered(row.series.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.path
                    d={row.path}
                    fill="none"
                    stroke={row.color}
                    strokeWidth={hovered === row.series.key ? 2.5 : 2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: MOTION.drawIn, delay: i * 0.04, ease: "easeOut" }}
                  />
                  {row.series.points.map((point) => (
                    <circle
                      key={point.day}
                      cx={xScale(point.day) ?? 0}
                      cy={yScale(point.priceEur)}
                      r={3.5}
                      fill={row.color}
                      stroke={CHART_COLORS.surface}
                      strokeWidth={2}
                    />
                  ))}
                  {/* Leader line, so a nudged label still points at its series. */}
                  {Math.abs(row.labelY - row.endY) > 2 && (
                    <line
                      x1={row.endX + 4}
                      y1={row.endY}
                      x2={row.endX + 9}
                      y2={row.labelY}
                      stroke={row.color}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )}
                  <text
                    x={row.endX + 11}
                    y={row.labelY}
                    dy="0.32em"
                    fontSize={11}
                    fill={CHART_COLORS.inkSecondary}
                  >
                    {truncateLabel(row.label, 22)}
                  </text>
                </g>
              );
            })}

            <AxisBottom
              scale={scaleLinear().domain([0, 1]).range([0, innerWidth])}
              width={innerWidth}
              y={innerHeight}
              tickCount={0}
              format={(() => "") as never}
            />
            {days.map((day) => (
              <text
                key={day}
                x={xScale(day) ?? 0}
                y={innerHeight + 16}
                textAnchor="middle"
                fontSize={11}
                fill={CHART_COLORS.muted}
              >
                {shortDate(day)}
              </text>
            ))}

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

function LegendItem({ color, glyph, label }: { color: string; glyph: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box component="span" sx={{ color, fontSize: 11 }}>
        {glyph}
      </Box>
      <Box sx={{ width: 14, height: 2.5, bgcolor: color, borderRadius: 1 }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
