"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/shared/design/tokens";
import type { Brand } from "@/features/brands/constants";
import { activeFilterCount, filterOffers, type Offer } from "@/features/offers/lib/offerModel";
import { useOfferFilterValues, useOfferFilters } from "@/features/offers/hooks/useOfferFilters";
import { useOffersData } from "@/features/offers/hooks/useOffersData";
import { CountBar, SearchBar } from "@/features/offers/filtering/components/OffersSearchBar";
import { FilterSheet } from "@/features/offers/filtering/components/FilterSheet";
import { OfferRow, OfferRowSkeleton } from "@/features/offers/components/OfferRow";
import { OfferPanel } from "@/features/offers/offer-detail/components/OfferPanel";

const PAGE = 40;

export const BrandScreen = ({ brand }: { brand: Brand }) => {
  const { all, isLoading } = useOffersData();
  const filters = useOfferFilterValues();
  const set = useOfferFilters((state) => state.set);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Offer | null>(null);

  const mine = useMemo(() => all.filter((offer) => offer.source === brand.slug), [all, brand.slug]);
  const visible = useMemo(() => filterOffers(mine, filters), [mine, filters]);

  const headline = useMemo(() => {
    if (mine.length === 0) return null;
    const resorts = new Set(mine.map((offer) => offer.resortKey));
    const moves = mine.map((offer) => offer.pct).filter((pct): pct is number => pct !== null).sort((a, b) => a - b);
    const cheapest = mine.reduce((best, offer) => (offer.total < best.total ? offer : best), mine[0]);
    return {
      resorts: resorts.size,
      cheapest,
      medianPct: moves.length ? moves[Math.floor(moves.length / 2)] : null,
    };
  }, [mine]);

  const rows = visible.slice(0, limit);

  return (
    <>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ flex: "0 0 auto", px: 1.25, py: 1.1, bgcolor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <IconButton component={Link} href="/brands" aria-label="Back to brands" sx={{ color: COLORS.ink }}>
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: `${RADIUS.md}px`,
            overflow: "hidden",
            flexShrink: 0,
            bgcolor: brand.logoSrc ? COLORS.frost : brand.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {brand.logoSrc ? (
            <Image src={brand.logoSrc} alt="" width={30} height={30} style={{ objectFit: "contain" }} />
          ) : (
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{brand.initials}</Typography>
          )}
        </Box>
        <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{brand.name}</Typography>
      </Stack>

      {headline && (
        <Stack direction="row" spacing={1.1} sx={{ flex: "0 0 auto", px: 2, pt: 1.5, pb: 0.5 }}>
          <Stat label="Offers" value={mine.length.toLocaleString("en-GB")} sub={`${headline.resorts} resorts`} />
          <Stat
            label="Cheapest"
            value={`€${headline.cheapest.total.toLocaleString("en-GB")}`}
            sub={headline.cheapest.resort}
          />
          <Stat
            label="Overnight"
            value={
              headline.medianPct === null
                ? "—"
                : `${headline.medianPct > 0 ? "+" : headline.medianPct < 0 ? "−" : ""}${Math.abs(headline.medianPct).toFixed(1)}%`
            }
            sub="median"
            color={
              headline.medianPct === null
                ? COLORS.ink
                : headline.medianPct < 0
                  ? COLORS.positive
                  : headline.medianPct > 0
                    ? COLORS.negative
                    : COLORS.ink
            }
          />
        </Stack>
      )}

      <Box sx={{ flex: "0 0 auto", pt: 1 }}>
        <SearchBar
          value={filters.query}
          onChange={(query) => set({ query })}
          onOpenFilters={() => setSheetOpen(true)}
          activeCount={activeFilterCount(filters)}
          placeholder={`Search ${brand.name} offers`}
        />
      </Box>

      <CountBar
        left="Cheapest first"
        right={`${visible.length.toLocaleString("en-GB")} of ${mine.length.toLocaleString("en-GB")}`}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {isLoading && Array.from({ length: 6 }, (_, index) => <OfferRowSkeleton key={index} alt={index % 2 === 1} />)}

        {!isLoading &&
          rows.map((offer, index) => (
            <OfferRow key={offer.key} offer={offer} alt={index % 2 === 1} onOpen={setOpen} showBrand={false} />
          ))}

        {!isLoading && mine.length === 0 && (
          <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center", lineHeight: 1.6 }}>
            No prices collected for {brand.name} yet.
          </Typography>
        )}

        {!isLoading && mine.length > 0 && visible.length === 0 && (
          <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center", lineHeight: 1.6 }}>
            {brand.name} has {mine.length.toLocaleString("en-GB")} offers, but none match your search and filters.
          </Typography>
        )}

        {visible.length > rows.length && (
          <Box sx={{ p: 2 }}>
            <Box
              component="button"
              type="button"
              onClick={() => setLimit((current) => current + PAGE)}
              sx={{ width: "100%", minHeight: 44, borderRadius: `${RADIUS.md}px`, border: `1px solid ${COLORS.borderStrong}`, bgcolor: "transparent", color: COLORS.ink, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Show {Math.min(PAGE, visible.length - rows.length)} more
            </Box>
          </Box>
        )}
      </Box>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} offers={mine} filters={filters} />
      <OfferPanel offer={open} siblings={all} onClose={() => setOpen(null)} onPick={setOpen} />
    </>
  );
};

const Stat = ({ label, value, sub, color = COLORS.ink }: { label: string; value: string; sub: string; color?: string }) => {
  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 1.3, bgcolor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.md}px` }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.inkMuted }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.6, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography noWrap sx={{ mt: 0.3, fontSize: 10.5, color: COLORS.inkFaint }}>{sub}</Typography>
    </Box>
  );
};
