"use client";

import type { ReactNode } from "react";
import { Box, Stack } from "@mui/material";
import { COLORS, RADIUS } from "@/lib/design/tokens";
import { useIsMobile } from "@/lib/mobile/useMobile";
import { MobileShell } from "./MobileShell";

/**
 * Picks the phone app or the desktop page once the viewport is known.
 *
 * The server has no viewport, so the first paint is a neutral placeholder
 * rather than a guess: guessing desktop flashes the eleven-column table onto
 * a phone, and guessing mobile flashes a bottom bar onto a laptop. Both
 * branches are client-rendered anyway — the prices arrive from TanStack
 * Query, not from the server render — so nothing is lost by waiting a frame.
 */
export function Responsive({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
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
}
