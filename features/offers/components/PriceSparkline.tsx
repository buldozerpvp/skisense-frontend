"use client";

import { useMemo } from "react";
import { Box } from "@mui/material";
import { line } from "d3-shape";
import { extent } from "d3-array";
import { useChartColors, changeColor } from "@/shared/charts/lib/palette";
import {
  SPARKLINE_HEIGHT_PX,
  SPARKLINE_PADDING_PX,
  SPARKLINE_WIDTH_PX,
} from "@/features/offers/constants";

export interface SparklinePoint {
  day: string;
  total: number;
}

export const PriceSparkline = ({ points, movePct }: { points: SparklinePoint[]; movePct: number | null }) => {
  const colors = useChartColors();

  const path = useMemo(() => {
    if (points.length < 2) return "";
    const [low = 0, high = 0] = extent(points, (point) => point.total);
    const span = Math.max(high - low, 1);
    const innerWidth = SPARKLINE_WIDTH_PX - SPARKLINE_PADDING_PX * 2;
    const innerHeight = SPARKLINE_HEIGHT_PX - SPARKLINE_PADDING_PX * 2;
    const coords = points.map((point, i) => ({
      x: SPARKLINE_PADDING_PX + (i / (points.length - 1)) * innerWidth,
      y: SPARKLINE_PADDING_PX + innerHeight - ((point.total - low) / span) * innerHeight,
    }));
    return line<{ x: number; y: number }>()
      .x((point) => point.x)
      .y((point) => point.y)(coords) ?? "";
  }, [points]);

  if (!path) return null;

  const stroke = changeColor(movePct, colors);
  const last = points[points.length - 1];

  return (
    <Box
      component="svg"
      width={SPARKLINE_WIDTH_PX}
      height={SPARKLINE_HEIGHT_PX}
      aria-label={`${points.length} nights watched, latest €${Math.round(last.total).toLocaleString()}`}
      role="img"
      sx={{ display: "block", overflow: "visible" }}
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
};
