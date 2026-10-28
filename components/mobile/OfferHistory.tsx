"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { scaleLinear, scalePoint } from "d3-scale";
import { extent } from "d3-array";
import { line } from "d3-shape";
import { COLORS } from "@/lib/design/tokens";
import { useChartColors, changeColor } from "@/lib/charts/palette";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { shortDate } from "@/lib/analytics/format";

/** One night's observation of one offer. */
export interface OfferPointView {
  day: string;
  /** Total for the party, matching the headline price on the sheet. */
  total: number;
}

const HEIGHT = 168;
const MARGIN = { top: 14, right: 12, bottom: 26, left: 46 };

/**
 * What this one offer has cost on every night it has been collected.
 *
 * Not the resort's average and not the operator's: this hotel, this
 * departure, this stay length, from this operator. It is the question a
 * shopper actually has in front of a price — is this the moment, or was it
 * cheaper last week — and the one thing a table row cannot answer.
 *
 * Three deliberate choices:
 *
 * - **Only nights that were collected are drawn**, as dots, with straight
 *   segments between them. A missed night leaves a wider gap rather than a
 *   point, because inventing a reading for a night nobody looked at is how a
 *   gap in collection becomes a price movement in the chart.
 * - **The y axis does not start at zero.** A €2,000 holiday that moved €80 is
 *   a flat line against a zero baseline, and that move is the whole point. A
 *   minimum span keeps a €5 wobble from filling the frame instead.
 * - **The line takes its colour from the net move**, aqua for cheaper and red
 *   for pricier — the same polarity pair the rest of the app uses for change,
 *   never for level.
 */
export function OfferHistory({
  points,
  isLoading,
}: {
  points: OfferPointView[];
  isLoading: boolean;
}) {
  const colors = useChartColors();
  const motionSpec = useChartMotion();
  const { ref, width } = useChartDimensions(300);
  const [picked, setPicked] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(false);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const chart = useMemo(() => {
    const totals = points.map((point) => point.total);
    const [min = 0, max = 0] = extent(totals);
    // A floor on the visible range: without it a night where nothing moved
    // draws as a cliff, because the domain collapses onto a single value.
    const centre = (min + max) / 2;
    const halfSpan = Math.max((max - min) / 2, Math.max(centre * 0.01, 20));

    const x = scalePoint<string>()
      .domain(points.map((point) => point.day))
      .range([0, innerWidth])
      .padding(0.5);
    const y = scaleLinear()
      .domain([centre - halfSpan * 1.15, centre + halfSpan * 1.15])
      .range([innerHeight, 0])
      .nice(4);

    const coords = points.map((point) => ({
      x: x(point.day) ?? 0,
      y: y(point.total),
    }));
    const path = line<{ x: number; y: number }>()
      .x((point) => point.x)
      .y((point) => point.y)(coords);

    return {
      coords,
      path: path ?? "",
      ticks: y.ticks(3),
      yScale: y,
      low: min,
      high: max,
      net: totals.length > 1 ? totals[totals.length - 1] - totals[0] : 0,
    };
  }, [points, innerWidth, innerHeight]);

  if (points.length < 2) {
    return (
      <Typography
        sx={{ mt: 1.2, fontSize: 12, color: COLORS.inkMuted, lineHeight: 1.55 }}
      >
        {isLoading
          ? "Loading the price history…"
          : "First seen in tonight's collection — there is nothing earlier to compare it against yet."}
      </Typography>
    );
  }

  const stroke = changeColor(chart.net);
  const selected = picked === null ? points.length - 1 : picked;
  const reading = points[selected];

  return (
    <Box sx={{ mt: 1 }}>
      <Box ref={ref} sx={{ width: "100%" }}>
        <motion.svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Price for this offer on each night collected, ${shortDate(points[0].day)} to ${shortDate(points[points.length - 1].day)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={motionSpec.draw()}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* Gridlines and their labels are the frame: never animated, or
                nothing on the chart is measurable against anything. */}
            {chart.ticks.map((tick) => (
              <g key={tick} transform={`translate(0,${chart.yScale(tick)})`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
                <text
                  x={-8}
                  dy="0.32em"
                  textAnchor="end"
                  fill={colors.muted}
                  style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
                >
                  €{Math.round(tick).toLocaleString("en-GB")}
                </text>
              </g>
            ))}

            <path
              d={chart.path}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chart.coords.map((coord, index) => (
              <circle
                key={points[index].day}
                cx={coord.x}
                cy={coord.y}
                r={index === selected ? 4.5 : 2.5}
                fill={index === selected ? stroke : colors.surface}
                stroke={stroke}
                strokeWidth={1.5}
              />
            ))}

            {/* Full-height hit targets: a 2px dot is not a tap target, and a
                thumb landing anywhere in the column should read that night. */}
            {chart.coords.map((coord, index) => (
              <rect
                key={`hit-${points[index].day}`}
                x={coord.x - innerWidth / (points.length * 2)}
                y={0}
                width={innerWidth / points.length}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onPointerDown={() => setPicked(index)}
              />
            ))}

            <text
              x={0}
              y={innerHeight + 17}
              fill={colors.muted}
              style={{ fontSize: 10 }}
            >
              {shortDate(points[0].day)}
            </text>
            <text
              x={innerWidth}
              y={innerHeight + 17}
              textAnchor="end"
              fill={colors.muted}
              style={{ fontSize: 10 }}
            >
              {shortDate(points[points.length - 1].day)}
            </text>
          </g>
        </motion.svg>
      </Box>

      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ mt: 0.4 }}
      >
        <Typography
          sx={{
            fontSize: 12,
            color: COLORS.ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {shortDate(reading.day)} · €{reading.total.toLocaleString("en-GB")}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: COLORS.inkFaint,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          low €{chart.low.toLocaleString("en-GB")} · high €
          {chart.high.toLocaleString("en-GB")}
        </Typography>
      </Stack>

      {/* The readable equivalent of the line. Not decoration: the chart
          carries its meaning in a thin stroke and a colour, and this is what
          makes the same information available without either. */}
      <Box
        component="button"
        type="button"
        onClick={() => setShowValues((open) => !open)}
        aria-expanded={showValues}
        sx={{
          mt: 0.8,
          p: 0,
          border: "none",
          bgcolor: "transparent",
          fontFamily: "inherit",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.brand,
          cursor: "pointer",
        }}
      >
        {showValues ? "Hide every night" : "Show every night"}
      </Box>

      {showValues && (
        <Stack sx={{ mt: 0.6 }}>
          {[...points].reverse().map((point) => (
            <Stack
              key={point.day}
              direction="row"
              justifyContent="space-between"
              sx={{ py: 0.35, borderTop: `1px solid ${COLORS.border}` }}
            >
              <Typography sx={{ fontSize: 11.5, color: COLORS.inkMuted }}>
                {shortDate(point.day)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11.5,
                  color: COLORS.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                €{point.total.toLocaleString("en-GB")}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
