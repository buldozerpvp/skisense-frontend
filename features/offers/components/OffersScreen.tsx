"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { COLORS, RADIUS } from "@/shared/design/tokens";
import { PROPERTY_TYPE_LABEL } from "@/features/offers/lib/hotelLabels";
import { activeFilterCount, filterOffers, shortDeparture, type OfferFilters, type Offer } from "@/features/offers/lib/offerModel";
import { SORT_LABEL, DEFAULT_FILTERS } from "@/features/offers/constants";
import { useOfferFilterValues, useOfferFilters } from "@/features/offers/hooks/useOfferFilters";
import { useOffersData } from "@/features/offers/hooks/useOffersData";
import { FLIGHT_FILTER_LABEL } from "@/features/offers/inclusions/lib/packageInclusions";
import { BOARD_LABEL } from "@/features/offers/inclusions/lib/board";
import { ChipRow, CountBar, FilterChip, SearchBar } from "@/features/offers/filtering/components/OffersSearchBar";
import { FilterSheet } from "@/features/offers/filtering/components/FilterSheet";
import { OfferRow, OfferRowSkeleton } from "@/features/offers/components/OfferRow";
import { OfferPanel } from "@/features/offers/offer-detail/components/OfferPanel";

const PAGE = 60;

export const OffersScreen = () => {
  const { all, visible, isLoading, isError } = useOffersData();
  const filters = useOfferFilterValues();
  const set = useOfferFilters((state) => state.set);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Offer | null>(null);

  const activeCount = activeFilterCount(filters);

  const queryOnly = useMemo(
    () => (filters.query ? filterOffers(all, { ...DEFAULT_FILTERS, types: [], query: filters.query }) : []),
    [all, filters.query]
  );
  const hiddenByFilters = filters.query ? queryOnly.length - visible.length : 0;

  const rows = visible.slice(0, limit);

  return (
    <>
      <SearchBar
        value={filters.query}
        onChange={(query) => set({ query })}
        onOpenFilters={() => setSheetOpen(true)}
        activeCount={activeCount}
        placeholder="Search resort or hotel"
      />

      <ActiveChips filters={filters} />

      <CountBar
        left={`${SORT_LABEL[filters.sort]} first`}
        right={
          activeCount > 0 || filters.query
            ? `${visible.length.toLocaleString("en-GB")} of ${all.length.toLocaleString("en-GB")}`
            : `${all.length.toLocaleString("en-GB")} offers`
        }
      />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {isLoading && Array.from({ length: 8 }, (_, index) => <OfferRowSkeleton key={index} alt={index % 2 === 1} />)}

        {isError && (
          <Note>
            Could not reach the price data. Pull down to retry, or check that the collector has uploaded tonight.
          </Note>
        )}

        {!isLoading &&
          rows.map((offer, index) => (
            <OfferRow key={offer.key} offer={offer} alt={index % 2 === 1} onOpen={setOpen} />
          ))}

        {!isLoading && visible.length === 0 && (
          <Note>
            Nothing matches{filters.query ? ` “${filters.query}”` : ""} with these filters.
          </Note>
        )}

        {hiddenByFilters > 0 && (
          <Box sx={{ m: 2, p: 1.75, bgcolor: COLORS.surface, border: `1px solid ${COLORS.borderStrong}`, borderRadius: `${RADIUS.lg}px` }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>
              {hiddenByFilters.toLocaleString("en-GB")} more match “{filters.query}”
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 11.5, color: COLORS.inkMuted, lineHeight: 1.55 }}>
              Your filters are hiding them. Clear the filters to see every match, or edit them to let some back in.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.4 }}>
              <Box
                component="button"
                type="button"
                onClick={() => useOfferFilters.getState().reset()}
                sx={{ flex: 1, minHeight: 42, borderRadius: `${RADIUS.md}px`, border: "none", bgcolor: COLORS.brand, color: COLORS.canvas, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
              >
                Search all {all.length.toLocaleString("en-GB")}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setSheetOpen(true)}
                sx={{ flexShrink: 0, minHeight: 42, px: 1.9, borderRadius: `${RADIUS.md}px`, border: `1px solid ${COLORS.borderStrong}`, bgcolor: "transparent", color: COLORS.ink, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              >
                Edit filters
              </Box>
            </Stack>
          </Box>
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

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} offers={all} filters={filters} />
      <OfferPanel offer={open} siblings={all} onClose={() => setOpen(null)} onPick={setOpen} />
    </>
  );
};

export const ActiveChips = ({ filters }: { filters: OfferFilters }) => {
  const set = useOfferFilters((state) => state.set);
  const chips: { label: string; clear: () => void }[] = [];

  if (filters.flights) {
    chips.push({
      label: filters.flights.map((state) => FLIGHT_FILTER_LABEL[state]).join(", "),
      clear: () => set({ flights: null }),
    });
  }

  if (filters.resorts) chips.push({ label: `${filters.resorts.length} resorts`, clear: () => set({ resorts: null }) });
  if (filters.hotels) chips.push({ label: `${filters.hotels.length} hotels`, clear: () => set({ hotels: null }) });
  if (filters.countries) chips.push({ label: `${filters.countries.length} countries`, clear: () => set({ countries: null }) });
  if (filters.brands) chips.push({ label: `${filters.brands.length} operators`, clear: () => set({ brands: null }) });
  if (filters.types.length !== 2 || !filters.types.includes("hotel") || !filters.types.includes("club")) {
    chips.push({
      label: filters.types.length ? filters.types.map((type) => PROPERTY_TYPE_LABEL[type]).join(", ") : "No type",
      clear: () => set({ types: DEFAULT_FILTERS.types }),
    });
  }
  if (filters.board) {
    chips.push({ label: filters.board.map((b) => BOARD_LABEL[b]).join(", "), clear: () => set({ board: null }) });
  }
  if (filters.party !== "any") chips.push({ label: `${filters.party} people`, clear: () => set({ party: "any" }) });
  if (filters.nights) chips.push({ label: filters.nights.map((n) => `${n}n`).join(", "), clear: () => set({ nights: null }) });
  if (filters.from) chips.push({ label: `from ${shortDeparture(filters.from)}`, clear: () => set({ from: null }) });
  if (filters.to) chips.push({ label: `to ${shortDeparture(filters.to)}`, clear: () => set({ to: null }) });
  if (filters.maxTotal !== null)
    chips.push({ label: `up to €${filters.maxTotal.toLocaleString("en-GB")}`, clear: () => set({ maxTotal: null }) });
  if (filters.maxPerPerson !== null)
    chips.push({ label: `≤ €${filters.maxPerPerson.toLocaleString("en-GB")} each`, clear: () => set({ maxPerPerson: null }) });
  if (filters.change !== "any")
    chips.push({ label: filters.change === "down" ? "Dropped" : "Rose", clear: () => set({ change: "any" }) });
  if (filters.status !== "any") chips.push({ label: "New today", clear: () => set({ status: "any" }) });

  if (chips.length === 0) return null;

  return (
    <ChipRow>
      {chips.map((chip) => (
        <FilterChip key={chip.label} label={chip.label} onClear={chip.clear} />
      ))}
    </ChipRow>
  );
};

const Note = ({ children }: { children: React.ReactNode }) => {
  return (
    <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center", lineHeight: 1.6 }}>
      {children}
    </Typography>
  );
};
