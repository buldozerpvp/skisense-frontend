"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { COLORS } from "@/shared/design/tokens";
import { ANALYTICS_PILL_LABEL_PX } from "@/features/app-shell/constants";

export const AnalyticsPill = () => {
  const pathname = usePathname();
  const active = pathname === "/analytics";

  return (
    <Box
      component={Link}
      href="/analytics"
      aria-label="Price analytics"
      aria-current={active ? "page" : undefined}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 34,
        px: 1,
        borderRadius: 999,
        textDecoration: "none",
        border: "1px solid",
        borderColor: active ? "transparent" : "divider",
        bgcolor: active ? COLORS.brand : "transparent",
        color: active ? COLORS.canvas : COLORS.inkMuted,
        transition: "background-color 220ms ease, border-color 220ms ease, color 220ms ease",
        "& .ss-pill-icon": {
          transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
        "& .ss-pill-label": {
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
          maxWidth: active ? `${ANALYTICS_PILL_LABEL_PX}px` : 0,
          opacity: active ? 1 : 0,
          pl: active ? 0.75 : 0,
          transition:
            "max-width 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease, padding-left 260ms ease",
        },
        "&:hover, &:focus-visible": {
          bgcolor: active ? COLORS.brand : COLORS.frost,
          borderColor: active ? "transparent" : COLORS.brand,
          color: active ? COLORS.canvas : COLORS.brand,
          "& .ss-pill-icon": { transform: "translateY(-1px) scale(1.14)" },
          "& .ss-pill-label": { maxWidth: `${ANALYTICS_PILL_LABEL_PX}px`, opacity: 1, pl: 0.75 },
        },
        "@media (prefers-reduced-motion: reduce)": { "&, & *": { transition: "none" } },
      }}
    >
      <InsightsRoundedIcon className="ss-pill-icon" sx={{ fontSize: 18 }} />
      <Typography className="ss-pill-label" component="span">
        Analytics
      </Typography>
    </Box>
  );
};
