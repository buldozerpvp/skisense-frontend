"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllOffers, fetchLatestOffers } from "@/lib/api/pricesApi";
import { PRICES_STALE_TIME_MS } from "./client";

/**
 * The combined table and the stats section both call this — same queryKey,
 * so TanStack Query dedupes them into one request against the backend.
 */
export function useLatestOffers() {
  return useQuery({
    queryKey: ["prices", "latest"],
    queryFn: fetchLatestOffers,
    // The backend only refreshes once a day (02:00 Israel time), no need to poll.
    staleTime: PRICES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

/** Full day-by-day history, used for trend charts. */
export function useAllOffers() {
  return useQuery({
    queryKey: ["prices", "all"],
    queryFn: fetchAllOffers,
    staleTime: PRICES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
