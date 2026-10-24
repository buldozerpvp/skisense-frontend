"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { useChartColors } from "@/lib/charts/palette";

/**
 * Position is in CSS pixels relative to the chart's container, not SVG user
 * units — a chart drawn at a fixed width and scaled by its viewBox has to
 * convert before setting this, or the tooltip drifts away from its mark.
 */
export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/**
 * Absolutely positioned tooltip, flipped away from the right edge so it never
 * runs off the card. Tooltips enhance here — they're never the only way to read
 * a value, which is what the table view is for.
 */
export function ChartTooltip({
  tooltip,
  containerWidth,
}: {
  tooltip: TooltipState | null;
  containerWidth: number;
}) {
  const colors = useChartColors();
  if (!tooltip) return null;

  const flip = tooltip.x > containerWidth - 220;

  return (
    <Box
      role="tooltip"
      sx={{
        position: "absolute",
        left: tooltip.x,
        top: tooltip.y,
        transform: flip ? "translate(-100%, -50%) translateX(-12px)" : "translate(0, -50%) translateX(12px)",
        pointerEvents: "none",
        zIndex: 5,
        // Very slightly translucent, as before, so a mark directly underneath
        // still reads through it — mixed rather than a fixed rgba so it holds
        // in both themes.
        bgcolor: `color-mix(in srgb, ${colors.surface} 97%, transparent)`,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        boxShadow: "0 4px 16px rgba(16,24,40,0.12)",
        px: 1.25,
        py: 1,
        fontSize: 12,
        lineHeight: 1.5,
        maxWidth: 260,
        whiteSpace: "nowrap",
      }}
    >
      {tooltip.content}
    </Box>
  );
}
