"use client";

import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { scaleBand, scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeftBand } from "./primitives/Axes";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartColors, MOTION, changeColor } from "@/lib/charts/palette";
import { bidi, eur, eurDelta, offerLabel, pct, shortDate, trendGlyph } from "@/lib/analytics/format";
import type { Movement } from "@/lib/analytics/types";

// The left margin holds the resort-and-departure row label and the right holds
// the change figure, both outside the plot so neither can overlap a dot.
// ROW_HEIGHT sets the svg's height from the row count, so the card grows with
// the data instead of scrolling a fixed box.
const MARGIN = { top: 8, right: 92, bottom: 44, left: 190 };
const ROW_HEIGHT = 30;

/**
 * Previous price -> latest price as a connector with a dot at each end.
 *
 * A dumbbell is the right form here because the reader needs both the level
 * (what does this week cost?) and the change (how far did it move?) in one mark.
 * Grouped bars would encode the level twice and make the gap — the actual story —
 * the hardest thing to see. It also works correctly with just two snapshots.
 */
export function MoversDumbbell({
  movers,
  isFetching,
  direction,
  basis = "prev",
}: {
  movers: Movement[];
  isFetching: boolean;
  direction: "drop" | "rise";
  /** Which comparison the rows were ranked by — the marks must show the same one,
   *  or a row picked for its drop since tracking began can be drawn going up. */
  basis?: "prev" | "first";
}) {
  // One place decides what "before", "change" and "%" mean for this chart.
  const before = (m: Movement) => (basis === "prev" ? m.prev : m.first) ?? m.latest;
  const delta = (m: Movement) => (basis === "prev" ? m.deltaPrev : m.deltaFirst);
  const percent = (m: Movement) => (basis === "prev" ? m.pctPrev : m.pctFirst);
  const sinceLabel = basis === "prev" ? "last night" : "we started tracking";
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(720);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = movers.length * ROW_HEIGHT;
  const height = innerHeight + MARGIN.top + MARGIN.bottom;

  const { xScale, yScale } = useMemo(() => {
    const prices = movers.flatMap((m) => [m.latest, before(m)]);
    const [min = 0, max = 1] = extent(prices);
    const pad = (max - min) * 0.12 || 100;

    return {
      xScale: scaleLinear().domain([min - pad, max + pad]).range([0, innerWidth]).nice(),
      yScale: scaleBand<string>()
        .domain(movers.map((m) => m.key))
        .range([0, innerHeight])
        .padding(0.25),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movers, innerWidth, innerHeight, basis]);

  // The band domain is keyed by offer id for stable identity; the axis needs
  // the human label for the same row.
  const rowLabels = useMemo(
    () => new Map(movers.map((m) => [m.key, offerLabel(m.resort, m.departure)])),
    [movers]
  );

  const tableColumns: TableColumn<Movement>[] = [
    { header: "Resort", render: (m) => m.resort },
    { header: "Departure", render: (m) => shortDate(m.departure) },
    { header: "Was", numeric: true, render: (m) => eur(before(m)) },
    { header: "Now", numeric: true, render: (m) => eur(m.latest) },
    {
      header: "Change",
      numeric: true,
      render: (m) => {
        const d = delta(m);
        return d != null ? `${trendGlyph(d)} ${eurDelta(d)}` : "—";
      },
    },
    { header: "%", numeric: true, render: (m) => (percent(m) != null ? pct(percent(m) as number) : "—") },
  ];

  const title = direction === "drop" ? `Cheaper than ${sinceLabel}` : "Going up";
  const subtitle =
    direction === "drop"
      ? `Hollow dot = the price ${basis === "prev" ? "last night" : "when we started"}. Solid dot = today.`
      : `These weeks cost more than they did ${sinceLabel}.`;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      isEmpty={movers.length === 0}
      emptyMessage={
        direction === "drop"
          ? "No price cuts worth flagging. We check again tonight."
          : "Nothing went up."
      }
      isFetching={isFetching}
      tableRows={movers}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg width="100%" height={height} role="img" aria-label={`${title}, ${movers.length} offers`}>
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeftBand scale={yScale} labels={rowLabels} />

            {movers.map((m, i) => {
              const y = (yScale(m.key) ?? 0) + yScale.bandwidth() / 2;
              const from = xScale(before(m));
              const to = xScale(m.latest);
              const move = delta(m);
              const color = changeColor(move, colors);
              const delay = i * MOTION.stagger;

              return (
                <g
                  key={m.key}
                  onMouseEnter={() =>
                    setTooltip({
                      x: to,
                      y: y + MARGIN.top,
                      content: (
                        <>
                          <strong>{bidi(m.resort)}</strong>
                          <br />
                          Departs {shortDate(m.departure)}
                          <br />
                          {`${eur(before(m))} → `}
                          <strong>{eur(m.latest)}</strong>
                          <br />
                          <span style={{ color }}>
                            {move != null ? `${trendGlyph(move)} ${eurDelta(move)}` : "new"}
                            {percent(m) != null ? ` (${pct(percent(m) as number)})` : ""}
                          </span>
                          {m.status !== "default" && (
                            <>
                              <br />
                              <span style={{ color: colors.inkSecondary }}>
                                The operator calls this {m.status === "green" ? "their best price" : "last rooms"}
                              </span>
                            </>
                          )}
                        </>
                      ),
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Generous hit area — the marks themselves are far too small to target. */}
                  <rect x={0} y={y - ROW_HEIGHT / 2} width={innerWidth} height={ROW_HEIGHT} fill="transparent" />

                  {/* An attribute that appears in `animate` must not also be a
                      static prop, or framer owns it and React's value is ignored
                      — that is what made filter changes half-teleport. */}
                  <motion.line
                    x1={from}
                    y1={y}
                    y2={y}
                    initial={{ x2: from }}
                    animate={{ x2: to }}
                    transition={{ duration: MOTION.grow, delay, ease: "easeOut" }}
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/* Where it was: hollow, recessive. */}
                  <circle cx={from} cy={y} r={4} fill={colors.surface} stroke={colors.muted} strokeWidth={1.5} />
                  {/* Where it is now: solid, with a surface ring so overlaps stay readable. */}
                  <motion.circle
                    cy={y}
                    initial={{ cx: from }}
                    animate={{ cx: to }}
                    transition={{ duration: MOTION.grow, delay, ease: "easeOut" }}
                    r={5.5}
                    fill={color}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                  {/* Direct label: the relief channel that makes the aqua fill legible. */}
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: MOTION.hover, delay: delay + MOTION.grow }}
                    x={innerWidth + 8}
                    y={y}
                    dy="0.32em"
                    fontSize={12}
                    fontWeight={600}
                    fill={color}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {move != null ? `${trendGlyph(move)} ${eurDelta(move)}` : ""}
                  </motion.text>
                </g>
              );
            })}

            <AxisBottom
              scale={xScale}
              width={innerWidth}
              y={innerHeight}
              // Half-width cards get fewer ticks: six €-labels in ~400px overlap.
              tickCount={innerWidth < 420 ? 3 : innerWidth < 700 ? 4 : 6}
              format={((v: number) => eur(v)) as never}
              label="Price per person"
            />
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
}
