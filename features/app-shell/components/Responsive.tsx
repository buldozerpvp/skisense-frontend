"use client";

import type { ReactNode } from "react";
import { Box, Stack } from "@mui/material";
import { COLORS, RADIUS } from "@/shared/design/tokens";
import { useIsMobile } from "@/features/app-shell/hooks/useIsMobile";
import { MobileShell } from "@/features/app-shell/components/MobileShell";

export const Responsive = ({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) => {
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return (
      <Stack spacing={1.5} sx={{ p: 2 }} aria-hidden>
        <Box sx={{ height: 44, borderRadius: `${RADIUS.md}px`, bgcolor: COLORS.surface }} />
        <Box sx={{ height: 180, borderRadius: `${RADIUS.lg}px`, bgcolor: COLORS.surface }} />
      </Stack>
    );
  }

  return isMobile ? <MobileShell>{mobile}</MobileShell> : <>{desktop}</>;
};
