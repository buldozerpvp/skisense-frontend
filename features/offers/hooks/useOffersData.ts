"use client";

import { useMemo } from "react";
import { useAllOffers, useLatestOffers } from "@/features/prices/hooks/usePrices";
import { buildOffers, filterOffers, type Offer } from "@/features/offers/lib/offerModel";
import { useOfferFilterValues } from "@/features/offers/hooks/useOfferFilters";

export interface OffersData {
  all: Offer[];
  visible: Offer[];
  isLoading: boolean;
  isError: boolean;
  hasHistory: boolean;
}

export const useOffersData = (): OffersData => {
  const latest = useLatestOffers();
  const history = useAllOffers();
  const filters = useOfferFilterValues();

  const all = useMemo(
    () => buildOffers(latest.data, history.data),
    [latest.data, history.data]
  );
  const visible = useMemo(() => filterOffers(all, filters), [all, filters]);

  return {
    all,
    visible,
    isLoading: latest.isLoading,
    isError: latest.isError,
    hasHistory: history.data !== undefined,
  };
};
