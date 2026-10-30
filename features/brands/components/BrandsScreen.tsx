"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/shared/design/tokens";
import { BRANDS, type Brand } from "@/features/brands/constants";
import { activeFilterCount, type Offer } from "@/features/offers/lib/offerModel";
import { useOfferFilterValues, useOfferFilters } from "@/features/offers/hooks/useOfferFilters";
import { useOffersData } from "@/features/offers/hooks/useOffersData";
import { CountBar, SearchBar } from "@/features/offers/filtering/components/OffersSearchBar";
import { ActiveChips } from "@/features/offers/components/OffersScreen";
import { FilterSheet } from "@/features/offers/filtering/components/FilterSheet";

interface BrandRow {
  brand: Brand;
  count: number;
  total: number;
  cheapest: number | null;
  medianPct: number | null;
}

export const BrandsScreen = () => {
  const { all, visible, isLoading } = useOffersData();
  const filters = useOfferFilterValues();
  const set = useOfferFilters((state) => state.set);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = useMemo<BrandRow[]>(() => {
    const bySlug = new Map<string, Offer[]>();
    for (const offer of visible) {
      const list = bySlug.get(offer.source) ?? [];
      list.push(offer);
      bySlug.set(offer.source, list);
    }
    const totals = new Map<string, number>();
    for (const offer of all) totals.set(offer.source, (totals.get(offer.source) ?? 0) + 1);

    return BRANDS.map((brand) => {
      const matches = bySlug.get(brand.slug) ?? [];
      const moves = matches.map((offer) => offer.pct).filter((pct): pct is number => pct !== null).sort((a, b) => a - b);
      return {
        brand,
        count: matches.length,
        total: totals.get(brand.slug) ?? 0,
        cheapest: matches.length ? Math.min(...matches.map((offer) => offer.total)) : null,
        medianPct: moves.length ? moves[Math.floor(moves.length / 2)] : null,
      };
    }).sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || (a.cheapest ?? Infinity) - (b.cheapest ?? Infinity));
  }, [all, visible]);

  const matching = rows.filter((row) => row.count > 0).length;
  const narrowed = Boolean(filters.query) || activeFilterCount(filters) > 0;

  return (
    <>
      <Box sx={{ flex: "0 0 auto", px: 2, pt: 1.5, pb: 1 }}>
        <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: COLORS.ink }}>
          Brands
        </Typography>
        <Typography sx={{ mt: 0.4, fontSize: 12, color: COLORS.inkMuted }}>
          {BRANDS.length} operators, collected at 02:00 every night.
        </Typography>
      </Box>

      <SearchBar
        value={filters.query}
        onChange={(query) => set({ query })}
        onOpenFilters={() => setSheetOpen(true)}
        activeCount={activeFilterCount(filters)}
        placeholder="Search brands, resorts or hotels"
      />

      <ActiveChips filters={filters} />

      <CountBar
        left={narrowed ? `${matching} of ${BRANDS.length} brands match` : "All operators"}
        right={`${visible.length.toLocaleString("en-GB")} offers`}
      />

      <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2, WebkitOverflowScrolling: "touch" }}>
        {rows.map((row) => (
          <BrandCard key={row.brand.slug} row={row} narrowed={narrowed} loading={isLoading} />
        ))}
      </Stack>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} offers={all} filters={filters} />
    </>
  );
};

const BrandCard = ({ row, narrowed, loading }: { row: BrandRow; narrowed: boolean; loading: boolean }) => {
  const { brand, count, total, cheapest, medianPct } = row;
  const empty = !loading && count === 0;

  return (
    <Box
      component={Link}
      href={`/brands/${brand.slug}`}
      sx={{
        display: "block",
        p: 1.75,
        bgcolor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: `${RADIUS.lg}px`,
        textDecoration: "none",
        opacity: empty ? 0.55 : 1,
      }}
    >
      <Stack direction="row" spacing={1.4} alignItems="center">
        <Box
          sx={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: `${RADIUS.md}px`,
            overflow: "hidden",
            bgcolor: brand.logoSrc ? COLORS.frost : brand.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {brand.logoSrc ? (
            <Image src={brand.logoSrc} alt="" width={40} height={40} style={{ objectFit: "contain" }} />
          ) : (
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: "#fff" }}>
              {brand.initials}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink }}>{brand.name}</Typography>
          <Typography sx={{ fontSize: 11.5, color: COLORS.inkMuted }}>
            {loading
              ? "Loading…"
              : empty
                ? "No offers match"
                : narrowed
                  ? `${count.toLocaleString("en-GB")} of ${total.toLocaleString("en-GB")} match`
                  : `${count.toLocaleString("en-GB")} offers`}
          </Typography>
        </Box>

        <Box sx={{ flexShrink: 0, textAlign: "right" }}>
          {cheapest !== null && (
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
              from €{cheapest.toLocaleString("en-GB")}
            </Typography>
          )}
          {medianPct !== null && (
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: medianPct < 0 ? COLORS.positive : medianPct > 0 ? COLORS.negative : COLORS.inkMuted }}>
              {medianPct > 0 ? "+" : medianPct < 0 ? "−" : ""}
              {Math.abs(medianPct).toFixed(1)}% median
            </Typography>
          )}
        </Box>

        <ChevronRightRoundedIcon sx={{ flexShrink: 0, fontSize: 18, color: COLORS.inkFaint }} />
      </Stack>
    </Box>
  );
};
