import { COLORS } from "@/shared/design/tokens";
import { GLASS_BLUR, PRICE_TINT_PCT, ROW_HEIGHT_PX } from "@/features/offers/constants";

export const tableBodySx = {
  "& tbody tr[role='button']": {
    cursor: "pointer",
    bgcolor: "transparent",
    "&:hover": { bgcolor: `color-mix(in srgb, ${COLORS.frost} 75%, transparent)` },
    "&:focus-visible": { outline: `2px solid ${COLORS.brand}`, outlineOffset: "-2px" },
  },
  "& tbody tr": { height: ROW_HEIGHT_PX },
  "& tbody td": { fontSize: 13.5, px: 1.25, overflow: "hidden", minWidth: 0 },
  "& tbody td.ss-col-total, & tbody td.ss-col-perPerson": {
    textAlign: "center",
    justifyContent: "center",
    bgcolor: `color-mix(in srgb, ${COLORS.brand} ${PRICE_TINT_PCT.body}%, transparent)`,
  },
  "& tbody td.ss-col-total": {
    boxShadow: `inset 1px 0 0 ${COLORS.borderStrong}, inset -1px 0 0 ${COLORS.inkFaint}`,
  },
  "& tbody td.ss-col-perPerson": { boxShadow: `inset -1px 0 0 ${COLORS.borderStrong}` },
  "& tbody td.ss-col-open": {
    bgcolor: "inherit",
    backdropFilter: GLASS_BLUR,
    opacity: 1,
    zIndex: 3,
    '&[data-pinned="true"]::before': { backgroundColor: "transparent", boxShadow: "none" },
  },
};
