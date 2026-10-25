"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { APP_LOGO_ALT, APP_LOGO_SRC, APP_NAME } from "@/lib/branding";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";
import { useThemeMode } from "@/lib/design/useThemeMode";

/** Thumb-reachable minimum for anything tappable. */
export const TAP = 44;

/**
 * The frame every phone screen shares.
 *
 * Two destinations in the bottom bar, because Offers and Brands are the only
 * two places that hold content. Analytics is a pill in the top bar instead of
 * a third tab: it is a place you visit, not a place you browse from, and a
 * two-item bar keeps both targets wide enough to hit without looking.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const { mode, toggle } = useThemeMode();
  const pathname = usePathname();
  const onAnalytics = pathname === "/analytics";

  return (
    // The app is exactly one viewport tall and never scrolls as a page: the
    // header, the controls and the bottom bar are fixed, and the only thing
    // that moves is the list itself. A sticky header would still let the
    // search and filter chips slide away under it.
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", bgcolor: COLORS.canvas }}>
      <Box
        component="header"
        sx={{
          flex: "0 0 auto",
          zIndex: 1100,
          px: 1.75,
          py: 1.1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "color-mix(in srgb, var(--ss-surface) 88%, transparent)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <Stack component={Link} href="/" direction="row" spacing={1} alignItems="center" sx={{ textDecoration: "none" }}>
          <Image src={APP_LOGO_SRC} alt={APP_LOGO_ALT} width={26} height={26} priority />
          <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: COLORS.ink }}>
            {APP_NAME}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.9} alignItems="center">
          <Stack
            component={Link}
            href="/analytics"
            direction="row"
            spacing={0.6}
            alignItems="center"
            sx={{
              minHeight: 34,
              px: 1.4,
              borderRadius: 999,
              textDecoration: "none",
              border: onAnalytics ? "none" : `1px solid ${COLORS.borderStrong}`,
              bgcolor: onAnalytics ? COLORS.brand : "transparent",
              color: onAnalytics ? COLORS.canvas : COLORS.ink,
            }}
          >
            <InsightsRoundedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Analytics</Typography>
          </Stack>

          <IconButton
            onClick={toggle}
            size="small"
            aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            sx={{ width: 34, height: 34, color: COLORS.inkMuted, border: `1px solid ${COLORS.border}` }}
          >
            {mode === "dark" ? <LightModeRoundedIcon sx={{ fontSize: 17 }} /> : <DarkModeRoundedIcon sx={{ fontSize: 17 }} />}
          </IconButton>
        </Stack>
      </Box>

      <Box component="main" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </Box>

      <BottomNav pathname={pathname} />
    </Box>
  );
}

const TABS = [
  { href: "/", label: "Offers", icon: TableRowsRoundedIcon },
  { href: "/brands", label: "Brands", icon: StorefrontRoundedIcon },
];

/** Two tabs, each its own icon and label, with the safe-area inset respected. */
function BottomNav({ pathname }: { pathname: string }) {
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        flex: "0 0 auto",
        zIndex: 1100,
        display: "flex",
        gap: 1.25,
        px: 2,
        pt: 1,
        pb: "calc(14px + env(safe-area-inset-bottom))",
        bgcolor: COLORS.canvas,
        borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Stack
            key={href}
            component={Link}
            href={href}
            aria-current={active ? "page" : undefined}
            alignItems="center"
            justifyContent="center"
            spacing={0.1}
            sx={{
              flex: 1,
              minHeight: TAP + 2,
              borderRadius: 3,
              textDecoration: "none",
              bgcolor: active ? COLORS.frost : "transparent",
              color: active ? COLORS.ink : COLORS.inkMuted,
            }}
          >
            <Icon sx={{ fontSize: 19 }} />
            <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 600 }}>{label}</Typography>
          </Stack>
        );
      })}
    </Box>
  );
}
