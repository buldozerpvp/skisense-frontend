"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { scaleLinear, scalePoint } from "d3-scale";
import { extent } from "d3-array";
import { line } from "d3-shape";
import { COLORS } from "@/shared/design/tokens";
import { useChartColors, changeColor } from "@/shared/charts/lib/palette";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { shortDate } from "@/shared/format/formatters";
import { PRICE_HISTORY_HEIGHT_PX, PRICE_HISTORY_MARGIN } from "@/features/offers/offer-detail/constants";

export interface PricePoint {
  day: string;
  total: number;
}

export const OfferPriceHistory = ({
  points,
  isLoading,
}: {
  points: PricePoint[];
  isLoading: boolean;
}) => {
  const colors = useChartColors();
  const motionSpec = useChartMotion();
  const { ref, width } = useChartDimensions(300);
  const [picked, setPicked] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(false);

  const innerWidth = Math.max(width - PRICE_HISTORY_MARGIN.left - PRICE_HISTORY_MARGIN.right, 10);
  const innerHeight = PRICE_HISTORY_HEIGHT_PX - PRICE_HISTORY_MARGIN.top - PRICE_HISTORY_MARGIN.bottom;

  const chart = useMemo(() => {
    const totals = points.map((point) => point.total);
    const [min = 0, max = 0] = extent(totals);
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

    const coords = points.map((point) => ({ x: x(point.day) ?? 0, y: y(point.total) }));
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
      <Typography sx={{ mt: 1.2, fontSize: 12, color: COLORS.inkMuted, lineHeight: 1.55 }}>
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
          height={PRICE_HISTORY_HEIGHT_PX}
          role="img"
          aria-label={`Price for this offer on each night collected, ${shortDate(points[0].day)} to ${shortDate(points[points.length - 1].day)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={motionSpec.draw()}
        >
          <g transform={`translate(${PRICE_HISTORY_MARGIN.left},${PRICE_HISTORY_MARGIN.top})`}>
            {chart.ticks.map((tick) => (
              <g key={tick} transform={`translate(0,${chart.yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke={colors.grid} strokeWidth={1} />
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

            <path d={chart.path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

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

      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.4 }}>
        <Typography sx={{ fontSize: 12, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
          {shortDate(reading.day)} · €{reading.total.toLocaleString("en-GB")}
        </Typography>
        <Typography sx={{ fontSize: 11, color: COLORS.inkFaint, fontVariantNumeric: "tabular-nums" }}>
          low €{chart.low.toLocaleString("en-GB")} · high €{chart.high.toLocaleString("en-GB")}
        </Typography>
      </Stack>

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
              <Typography sx={{ fontSize: 11.5, color: COLORS.inkMuted }}>{shortDate(point.day)}</Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
                €{point.total.toLocaleString("en-GB")}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
};
