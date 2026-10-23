import { createTheme, alpha } from "@mui/material/styles";
import { COLORS, FONT_DISPLAY, FONT_SANS, RADIUS, SHADOWS } from "@/lib/design/tokens";

/**
 * The MUI theme. It only maps design tokens onto MUI's slots — no raw hex
 * values live here, so restyling the app means editing lib/design/tokens.ts.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
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
    // Headings use the display face; body stays on the plainer one so long
    // lists and tables read quietly.
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
          boxShadow: SHADOWS.card,
        },
        // Menus and popovers float — they get the stronger shadow, no border.
        elevation8: { border: "none", boxShadow: SHADOWS.raised },
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
            boxShadow: SHADOWS.card,
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

    // Table chrome, shared by Material React Table and the chart data tables.
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
        // Body rows only. A hover tint on the header row would make the
        // sticky header translucent (its cells inherit the row background),
        // and the rows scrolling underneath would show through it.
        root: {
          ".MuiTableBody-root &:hover": { backgroundColor: alpha(COLORS.sky, 0.06) },
        },
      },
    },
  },
});
