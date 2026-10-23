"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";

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
        bgcolor: "rgba(255,255,255,0.97)",
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
