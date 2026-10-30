import { createTheme, alpha } from "@mui/material/styles";
import {
  DARK_SHADOWS,
  FONT_DISPLAY,
  FONT_SANS,
  PALETTES,
  RADIUS,
  SHADOWS,
  type ThemeMode,
} from "@/shared/design/tokens";

export const buildTheme = (mode: ThemeMode) => {
  const COLORS = PALETTES[mode];
  const SHADOW = mode === "dark" ? DARK_SHADOWS : SHADOWS;
  return createTheme({
  palette: {
    mode,
    primary: { main: COLORS.brand, dark: COLORS.brandDeep, light: COLORS.sky, contrastText: "#fff" },
    secondary: { main: COLORS.accent, light: COLORS.accentSoft, contrastText: "#fff" },
    success: { main: COLORS.positive },
    error: { main: COLORS.negative },
    info: { main: COLORS.sky },
    background: { default: COLORS.canvas, paper: COLORS.surface },
    text: { primary: COLORS.ink, secondary: COLORS.inkMuted, disabled: COLORS.inkFaint },
    divider: COLORS.border,
  },

  shape: { borderRadius: RADIUS.md },

  typography: {
    fontFamily: FONT_SANS,
    h1: { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.015em" },
    h5: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    overline: { fontWeight: 700, letterSpacing: "0.12em", fontSize: 11 },
  },

  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOW.card,
        },
        elevation8: { border: "none", boxShadow: SHADOW.raised },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: RADIUS.pill, paddingInline: 16 },
        containedPrimary: {
          background: `linear-gradient(180deg, ${COLORS.sky}, ${COLORS.brand})`,
          "&:hover": { background: `linear-gradient(180deg, ${COLORS.brand}, ${COLORS.brandDeep})` },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: RADIUS.pill },
        outlined: { borderColor: COLORS.border },
      },
    },

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { backgroundColor: COLORS.frost, borderRadius: RADIUS.pill, padding: 3, gap: 3 },
        grouped: {
          border: "none !important",
          borderRadius: `${RADIUS.pill}px !important`,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          color: COLORS.inkMuted,
          "&.Mui-selected": {
            backgroundColor: COLORS.surface,
            color: COLORS.brand,
            boxShadow: SHADOW.card,
            "&:hover": { backgroundColor: COLORS.surface },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.md,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.borderStrong },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.ink,
          borderRadius: RADIUS.sm,
          fontSize: 12,
          padding: "6px 10px",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: COLORS.border },
        head: {
          backgroundColor: COLORS.frost,
          color: COLORS.ink,
          fontWeight: 700,
          letterSpacing: "0.01em",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          ".MuiTableBody-root &:hover": { backgroundColor: alpha(COLORS.sky, 0.06) },
        },
      },
    },
  },
});
};

export const theme = buildTheme("light");
