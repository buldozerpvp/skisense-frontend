"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { scaleBand, scaleLinear } from "d3-scale";
import { max as d3max } from "d3-array";
import { motion } from "framer-motion";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { useChartColors, changeColor } from "@/lib/charts/palette";
import { bidi, eur, eurDelta, pct, shortDate, truncateLabel } from "@/lib/analytics/format";
import { getBrand } from "@/lib/brands/config";
import type { HomeOffer, HomeSummary } from "@/lib/analytics/home";

// The left margin carries two lines per row — what the offer is, and what it
// costs now — and the top margin carries the cheaper/dearer legend above the
// zero line. ROW_HEIGHT sets the svg height from the row count.
const MARGIN = { top: 26, right: 24, bottom: 34, left: 198 };
const ROW_HEIGHT = 40;
/**
 * Space kept clear at both ends of the plot for the euro figures. Reserving it
 * in the *scale* rather than the margin is what stops a near-maximum bar from
 * pushing its own label out over the row names.
 */
const LABEL_GUTTER = 84;

/** Module-scope so AnimatedNumber keeps a stable function identity. */
const asCount = (value: number) => String(Math.round(value));

/**
 * What changed since the last price check.
 *
 * Diverging bars off a single zero line: side *and* colour say which way, bar
 * length says how far, and the euro figure sits at the end of every bar so the
 * aqua never has to carry the meaning on its own. Drops and rises share one
 * chart because they answer one question — splitting them, as two separate
 * dumbbell cards did, made the reader compare two independent x-axes to find
 * out whether the market was moving up or down.
 *
 * Ranked by percentage, so a €200 cut on a Bulgarian long weekend still gets a
 * hearing next to a €2,000 swing on a Club Med week.
 */
export function ChangeBoard({
  moves,
  summary,
  isFetching,
}: {
  moves: HomeOffer[];
  summary: HomeSummary;
  isFetching: boolean;
}) {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(760);
  const { move, stagger } = useChartMotion();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = Math.max(moves.length * ROW_HEIGHT, 1);
  const height = innerHeight + MARGIN.top + MARGIN.bottom;

  const { xScale, yScale } = useMemo(() => {
    const bound = d3max(moves, (m) => Math.abs(m.pct ?? 0)) ?? 1;
    return {
      // Symmetric on purpose: a −8% and a +8% must read as mirror images, or
      // the chart quietly exaggerates whichever direction happens to be larger.
      xScale: scaleLinear()
        .domain([-bound, bound])
        .range([LABEL_GUTTER, Math.max(innerWidth - LABEL_GUTTER, LABEL_GUTTER + 1)]),
      yScale: scaleBand<string>()
        .domain(moves.map((m) => m.key))
        .range([0, innerHeight])
        .padding(0.34),
    };
  }, [moves, innerWidth, innerHeight]);

  const zero = xScale(0);

  const tableColumns: TableColumn<HomeOffer>[] = [
    { header: "Resort", render: (m) => m.resort },
    { header: "Departs", render: (m) => shortDate(m.departure) },
    { header: "Operator", render: (m) => getBrand(m.source)?.name ?? m.source },
    { header: "Nights", numeric: true, render: (m) => m.nights },
    { header: "Was", numeric: true, render: (m) => (m.prevTotal != null ? eur(m.prevTotal) : "—") },
    { header: "Now", numeric: true, render: (m) => eur(m.total) },
    { header: "Change", numeric: true, render: (m) => (m.delta != null ? eurDelta(m.delta) : "—") },
    { header: "%", numeric: true, render: (m) => (m.pct != null ? pct(m.pct) : "—") },
  ];

  return (
    <ChartCard
      title="What changed since the last price check"
      subtitle="Bars run left for cheaper and right for dearer; how far they run is how big the move was. Figures are the change in the total booking cost."
      isEmpty={moves.length === 0}
      emptyMessage="Nothing moved by more than €50 and 2% since the last check. We look again tonight."
      isFetching={isFetching}
      tableRows={moves}
      tableColumns={tableColumns}
    >
      <Stack
        direction="row"
        spacing={3}
        alignItems="baseline"
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={0.75} alignItems="baseline">
          <Typography variant="h4" fontWeight={800} sx={{ color: colors.drop }}>
            <AnimatedNumber value={summary.cheaper} format={asCount} duration={0.5} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            got cheaper
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="baseline">
          <Typography variant="h4" fontWeight={800} sx={{ color: colors.rise }}>
            <AnimatedNumber value={summary.dearer} format={asCount} duration={0.5} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            went up
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          out of {summary.rechecked.toLocaleString("en-GB")} bookings we had a previous price for
          {summary.lastCheck ? ` · last checked ${shortDate(summary.lastCheck)}` : ""}
        </Typography>
      </Stack>

      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          width="100%"
          height={height}
          role="img"
          aria-label={`Biggest price changes, ${moves.length} bookings`}
        >
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* Direction legend sits on the frame, not on the data. */}
            <text x={zero - 10} y={-12} textAnchor="end" fontSize={11} fontWeight={600} fill={colors.drop}>
              ◀ cheaper
            </text>
            <text x={zero + 10} y={-12} fontSize={11} fontWeight={600} fill={colors.rise}>
              dearer ▶
            </text>

            {/* The zero line is the whole chart's reference — never animated. */}
            <line
              x1={zero}
              x2={zero}
              y1={-4}
              y2={innerHeight}
              stroke={colors.axis}
              strokeWidth={1}
            />

            {moves.map((m, i) => {
              const y = (yScale(m.key) ?? 0) + yScale.bandwidth() / 2;
              const bandHeight = Math.min(yScale.bandwidth(), 18);
              const end = xScale(m.pct ?? 0);
              const isDrop = (m.delta ?? 0) < 0;
              // Colour snaps; only the geometry tweens. A tweened fill passes
              // through the neutral midpoint and reads as "no change".
              const colour = changeColor(m.delta, colors);
              const left = Math.min(zero, end);
              const barWidth = Math.abs(end - zero);

              return (
                <g
                  key={m.key}
                  onMouseEnter={() =>
                    setTooltip({
                      x: isDrop ? left : left + barWidth,
                      y: y + MARGIN.top,
                      content: (
                        <>
                          <strong>{bidi(m.resort)}</strong> · departs {shortDate(m.departure)}
                          <br />
                          {getBrand(m.source)?.name ?? m.source} · {m.nights} nights
                          {m.hotel ? (
                            <>
                              <br />
                              {bidi(m.hotel)}
                            </>
                          ) : null}
                          <br />
                          {m.prevTotal != null ? `${eur(m.prevTotal)} → ` : ""}
                          <strong>{eur(m.total)}</strong> total
                          <br />
                          <span style={{ color: colour, fontWeight: 600 }}>
                            {m.delta != null ? eurDelta(m.delta) : ""}
                            {m.pct != null ? ` (${pct(m.pct)})` : ""}
                          </span>
                        </>
                      ),
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={-MARGIN.left}
                    y={y - ROW_HEIGHT / 2}
                    width={innerWidth + MARGIN.left}
                    height={ROW_HEIGHT}
                    fill="transparent"
                  />

                  {/* Row label: what it is, and what it now costs. */}
                  <text
                    x={-12}
                    y={y - 4}
                    textAnchor="end"
                    fontSize={12}
                    fontWeight={600}
                    fill={colors.ink}
                  >
                    {truncateLabel(bidi(m.resort), 18)} · {shortDate(m.departure)}
                  </text>
                  <text
                    x={-12}
                    y={y + 10}
                    textAnchor="end"
                    fontSize={11}
                    fill={colors.muted}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    now {eur(m.total)} · {m.nights}n
                  </text>

                  {/* Grows out of the zero line. `x` and `width` are animated, so
                      neither may also be a static prop. */}
                  <motion.rect
                    y={y - bandHeight / 2}
                    height={bandHeight}
                    rx={3}
                    initial={{ x: zero, width: 0 }}
                    animate={{ x: left, width: Math.max(barWidth, 2) }}
                    transition={move(stagger(i))}
                    fill={colour}
                  />

                  {/* The euro figure, outside the bar, always on the far side
                      from zero — the relief channel for the aqua fill. */}
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={move(stagger(i) + 0.12)}
                    x={isDrop ? left - 8 : left + barWidth + 8}
                    y={y - 3}
                    textAnchor={isDrop ? "end" : "start"}
                    fontSize={13}
                    fontWeight={800}
                    fill={colour}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {m.delta != null ? eurDelta(m.delta) : ""}
                  </motion.text>
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={move(stagger(i) + 0.12)}
                    x={isDrop ? left - 8 : left + barWidth + 8}
                    y={y + 11}
                    textAnchor={isDrop ? "end" : "start"}
                    fontSize={11}
                    fill={colors.muted}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {m.pct != null ? pct(m.pct, 0) : ""}
                  </motion.text>
                </g>
              );
            })}
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
}
