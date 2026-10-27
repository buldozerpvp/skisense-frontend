"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { useAllOffers, useLatestOffers } from "@/lib/query/usePrices";
import {
  DEFAULT_FILTERS,
  buildMobileOffers,
  filterMobileOffers,
  type MobileFilters,
  type MobileOffer,
} from "./model";

/** Phones and small tablets get the app layout; anything wider keeps the table. */
export const MOBILE_MAX_WIDTH = 899.95;

/**
 * Null until the component has mounted, because the server has no viewport.
 *
 * Callers render a placeholder for that first paint rather than guessing:
 * guessing desktop flashes the eleven-column table onto a phone, and guessing
 * mobile flashes a bottom bar onto a laptop.
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

interface FilterState extends MobileFilters {
  set: (patch: Partial<MobileFilters>) => void;
  reset: () => void;
  clear: (field: keyof MobileFilters) => void;
}

/**
 * The phone's filter state, one store for the whole app so the offers tab,
 * the brands tab and a brand page all narrow by the same thing — pick two
 * operators on Brands and the offers list is already filtered when you
 * switch back to it.
 */
export const useMobileFilters = create<FilterState>((set) => ({
  ...DEFAULT_FILTERS,
  set: (patch) => set(patch),
  reset: () => set({ ...DEFAULT_FILTERS }),
  clear: (field) => set({ [field]: DEFAULT_FILTERS[field] } as Partial<MobileFilters>),
}));

/** Just the filter values, without the setters, for memo dependencies. */
export function useFilterValues(): MobileFilters {
  const store = useMobileFilters();
  return useMemo(
    () => ({
      query: store.query,
      resorts: store.resorts,
      hotels: store.hotels,
      countries: store.countries,
      brands: store.brands,
      types: store.types,
      party: store.party,
      nights: store.nights,
      from: store.from,
      to: store.to,
      maxTotal: store.maxTotal,
      maxPerPerson: store.maxPerPerson,
      change: store.change,
      status: store.status,
      flights: store.flights,
      board: store.board,
      sort: store.sort,
    }),
    [
      store.query, store.resorts, store.hotels, store.countries, store.brands,
      store.types, store.party, store.nights, store.from, store.to,
      store.maxTotal, store.maxPerPerson, store.change, store.status, store.flights, store.board, store.sort,
    ]
  );
}

export interface MobileData {
  /** Every live offer, before any filter — pickers count against this. */
  all: MobileOffer[];
  /** What the current filters leave. */
  visible: MobileOffer[];
  isLoading: boolean;
  isError: boolean;
  /** True once the history query has landed and the move badges are real. */
  hasHistory: boolean;
}

/**
 * The one data hook every mobile screen uses.
 *
 * Both queries share TanStack's cache with the desktop page, so switching
 * widths or tabs costs no extra request.
 */
export function useMobileData(): MobileData {
  const latest = useLatestOffers();
  const history = useAllOffers();
  const filters = useFilterValues();

  const all = useMemo(
    () => buildMobileOffers(latest.data, history.data),
    [latest.data, history.data]
  );
  const visible = useMemo(() => filterMobileOffers(all, filters), [all, filters]);

  return {
    all,
    visible,
    isLoading: latest.isLoading,
    isError: latest.isError,
    hasHistory: history.data !== undefined,
  };
}
