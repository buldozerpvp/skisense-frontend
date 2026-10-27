"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { COLORS } from "@/lib/design/tokens";
import { PROPERTY_TYPE_LABEL } from "@/lib/table/hotels";
import {
  activeFilterCount,
  filterMobileOffers,
  shortDeparture,
  SORT_LABEL,
  DEFAULT_FILTERS,
  type MobileFilters,
  type MobileOffer,
} from "@/lib/mobile/model";
import { useFilterValues, useMobileData, useMobileFilters } from "@/lib/mobile/useMobile";
import { FLIGHT_FILTER_LABEL } from "@/lib/offers/inclusions";
import { BOARD_LABEL } from "@/lib/offers/board";
import { ChipRow, CountBar, FilterChip, SearchBar } from "./SearchBar";
import { FilterSheet } from "./FilterSheet";
import { OfferRow, OfferRowSkeleton } from "./OfferRow";
import { OfferSheet } from "./OfferSheet";

/** Rows rendered before the "show more" button. A phone scrolls, it doesn't page. */
const PAGE = 60;

/**
 * The offers tab: search and filters pinned at the top, then one vertical
 * list. No horizontal scrolling anywhere, which is the whole point of not
 * carrying the eleven-column table onto a phone.
 */
export function MobileOffers() {
  const { all, visible, isLoading, isError } = useMobileData();
  const filters = useFilterValues();
  const set = useMobileFilters((state) => state.set);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<MobileOffer | null>(null);

  const activeCount = activeFilterCount(filters);

  // What the query alone would find. When that is bigger than what is on
  // screen, the filters are hiding matches and the list has to say so.
  const queryOnly = useMemo(
    () => (filters.query ? filterMobileOffers(all, { ...DEFAULT_FILTERS, types: [], query: filters.query }) : []),
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

        {/* A short list has to explain itself: without this, a stale filter
            reads as a broken search. */}
        {hiddenByFilters > 0 && (
          <Box sx={{ m: 2, p: 1.75, bgcolor: COLORS.surface, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 4 }}>
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
                onClick={() => useMobileFilters.getState().reset()}
                sx={{ flex: 1, minHeight: 42, borderRadius: 3, border: "none", bgcolor: COLORS.brand, color: COLORS.canvas, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
              >
                Search all {all.length.toLocaleString("en-GB")}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setSheetOpen(true)}
                sx={{ flexShrink: 0, minHeight: 42, px: 1.9, borderRadius: 3, border: `1px solid ${COLORS.borderStrong}`, bgcolor: "transparent", color: COLORS.ink, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
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
              sx={{ width: "100%", minHeight: 44, borderRadius: 3, border: `1px solid ${COLORS.borderStrong}`, bgcolor: "transparent", color: COLORS.ink, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Show {Math.min(PAGE, visible.length - rows.length)} more
            </Box>
          </Box>
        )}
      </Box>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} offers={all} filters={filters} />
      <OfferSheet offer={open} siblings={all} onClose={() => setOpen(null)} onPick={setOpen} />
    </>
  );
}

/** One chip per active filter, each dropping only its own. */
export function ActiveChips({ filters }: { filters: MobileFilters }) {
  const set = useMobileFilters((state) => state.set);
  const chips: { label: string; clear: () => void }[] = [];

  // Always first, and always shown even at its default: it is on when you
  // arrive and it hides a fifth of the rows, so it cannot be silent.
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
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center", lineHeight: 1.6 }}>
      {children}
    </Typography>
  );
}
