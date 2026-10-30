"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllOffers, fetchLatestOffers } from "@/features/prices/lib/pricesApi";
import { PRICES_STALE_TIME_MS } from "@/features/prices/lib/queryClient";

export const useLatestOffers = () => {
  return useQuery({
    queryKey: ["prices", "latest"],
    queryFn: fetchLatestOffers,
    staleTime: PRICES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
};

export const useAllOffers = () => {
  return useQuery({
    queryKey: ["prices", "all"],
    queryFn: fetchAllOffers,
    staleTime: PRICES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
};
