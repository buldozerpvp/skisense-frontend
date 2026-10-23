import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { COLORS, RADIUS } from "@/lib/design/tokens";

interface SectionHeadingProps {
  icon: ReactNode;
  title: string;
  /** One line saying what the section is for — skippable, but it earns its space. */
  subtitle?: string;
  /** Optional control shown on the right (a filter, a link). */
  action?: ReactNode;
}

/** The repeated section header: tinted icon tile, title, subtitle, optional action. */
export function SectionHeading({ icon, title, subtitle, action }: SectionHeadingProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
      <Box
        aria-hidden
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: `${RADIUS.md}px`,
          display: "grid",
          placeItems: "center",
          bgcolor: COLORS.frost,
          color: COLORS.brand,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontSize: { xs: 20, sm: 23 } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ ml: "auto" }}>{action}</Box>}
    </Stack>
  );
}
