"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { type OfferFilters } from "@/features/offers/lib/offerModel";
import { DEFAULT_FILTERS } from "@/features/offers/constants";

interface FilterState extends OfferFilters {
  set: (patch: Partial<OfferFilters>) => void;
  reset: () => void;
  clear: (field: keyof OfferFilters) => void;
}

export const useOfferFilters = create<FilterState>((set) => ({
  ...DEFAULT_FILTERS,
  set: (patch) => set(patch),
  reset: () => set({ ...DEFAULT_FILTERS }),
  clear: (field) => set({ [field]: DEFAULT_FILTERS[field] } as Partial<OfferFilters>),
}));

export const useOfferFilterValues = (): OfferFilters => {
  const store = useOfferFilters();
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
};
