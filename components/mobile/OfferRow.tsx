"use client";

import { Box, Stack, Typography } from "@mui/material";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/lib/design/tokens";
import { PROPERTY_TYPE_ICON } from "@/lib/table/hotels";
import { shortDeparture, type MobileOffer } from "@/lib/mobile/model";
import { useResortCard } from "@/lib/resorts/useResortCard";
import { BOARD_ICON, BOARD_LABEL, roomShort } from "@/lib/offers/board";

/** Aqua for cheaper, red for pricier — the same pair the charts use. */
export function changeColor(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 0.05) return COLORS.inkMuted;
  return pct < 0 ? COLORS.positive : COLORS.negative;
}

/** A signed percentage, or a dash while the history query is still in flight. */
export function changeLabel(pct: number | null): string {
  if (pct === null) return "—";
  if (Math.abs(pct) < 0.05) return "0.0%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

/**
 * One offer as two lines: what and where on top with the total, then the
 * details that the desktop spends eight columns on. Nothing scrolls sideways,
 * so the price is always on screen.
 */
export function OfferRow({
  offer,
  alt,
  onOpen,
  showBrand = true,
}: {
  offer: MobileOffer;
  alt: boolean;
  onOpen: (offer: MobileOffer) => void;
  /** False on a brand's own page, where every row would repeat its name. */
  showBrand?: boolean;
}) {
  const nights = offer.nights ? `${offer.nights}n` : "—";
  // Club Med names its properties after itself, so "Club Med · Club Med"
  // would be the second line on every one of its rows.
  const property =
    offer.hotel && offer.hotel !== offer.brandName
      ? showBrand
        ? `${offer.hotel} · ${offer.brandName}`
        : offer.hotel
      : offer.brandName;
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpen(offer)}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(offer);
        }
      }}
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "2px 12px",
        alignItems: "center",
        textAlign: "left",
        px: 2,
        py: 1.35,
        border: "none",
        borderBottom: `1px solid ${COLORS.border}`,
        bgcolor: alt ? COLORS.surface : "transparent",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {/* The row opens the offer; the resort name opens the resort. Nested
          targets, so the tap area for the name is kept deliberately tight. */}
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
        <Box
          component="span"
          role="button"
          tabIndex={0}
          aria-label={`About ${offer.resort}`}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            useResortCard.getState().open(offer.resortKey, offer.resort);
          }}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation();
              event.preventDefault();
              useResortCard.getState().open(offer.resortKey, offer.resort);
            }
          }}
          sx={{
            cursor: "pointer",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            textDecorationColor: COLORS.borderStrong,
            textUnderlineOffset: 3,
          }}
        >
          {offer.resort}
        </Box>{" "}
        {offer.flag}
      </Typography>

      <Box sx={{ gridRow: "span 2", textAlign: "right" }}>
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 700,
            color: COLORS.ink,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.15,
          }}
        >
          €{offer.total.toLocaleString("en-GB")}
        </Typography>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: changeColor(offer.pct) }}>
          {changeLabel(offer.pct)}
        </Typography>
      </Box>

      <Typography noWrap sx={{ fontSize: 11.5, color: COLORS.inkMuted, minWidth: 0 }}>
        {PROPERTY_TYPE_ICON[offer.propertyType]} {property} · {shortDeparture(offer.departure)} · {nights} ·{" "}
        {offer.board === "unknown" ? "meals ?" : `${BOARD_ICON[offer.board]} ${BOARD_LABEL[offer.board].toLowerCase()}`} ·{" "}
        {roomShort(offer.pax)}
      </Typography>
    </Box>
  );
}

/** Shown while the first request is in flight: rows, not a spinner. */
export function OfferRowSkeleton({ alt }: { alt: boolean }) {
  return (
    <Stack
      spacing={0.8}
      sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alt ? COLORS.surface : "transparent" }}
    >
      <Box sx={{ width: "55%", height: 13, borderRadius: `${RADIUS.sm}px`, bgcolor: COLORS.border }} />
      <Box sx={{ width: "75%", height: 11, borderRadius: `${RADIUS.sm}px`, bgcolor: COLORS.border, opacity: 0.6 }} />
    </Stack>
  );
}
