"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { APP_LOGO_ALT, APP_LOGO_SRC, APP_NAME } from "@/lib/branding";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";
import { useThemeMode } from "@/lib/design/useThemeMode";

const LOGO_SIZE = 34;

/**
 * Sticky, frosted header: the mark, one contextual action, and the theme
 * switch. Searching lives in the table's own toolbar, next to the filters it
 * works with, rather than up here away from them.
 */
export function TopBar() {
  const pathname = usePathname();
  const { mode, toggle } = useThemeMode();

  const isHome = pathname === "/";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        // Tinted from the canvas so the blur reads in both themes; a fixed
        // white would turn into a bright band in dark mode.
        bgcolor: "color-mix(in srgb, var(--ss-surface) 82%, transparent)",
        backdropFilter: "blur(10px)",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", py: 1, minHeight: 64 }}>
          <Stack component={Link} href="/" direction="row" spacing={1.25} alignItems="center">
            <Image src={APP_LOGO_SRC} alt={APP_LOGO_ALT} width={LOGO_SIZE} height={LOGO_SIZE} priority />
            <Box>
              <Typography
                sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: 1.1 }}
              >
                {APP_NAME}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.inkFaint, letterSpacing: "0.04em" }}>
                Ski price tracker
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            {!isHome && (
              <Button component={Link} href="/" size="small" startIcon={<ArrowBackRoundedIcon />}>
                All brands
              </Button>
            )}
            <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
              <IconButton
                onClick={toggle}
                size="small"
                aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                sx={{ color: COLORS.inkMuted, border: "1px solid", borderColor: "divider" }}
              >
                {mode === "dark" ? (
                  <LightModeRoundedIcon fontSize="small" />
                ) : (
                  <DarkModeRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
