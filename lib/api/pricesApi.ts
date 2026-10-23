import { API_BASE_URL, PRICES_ENDPOINTS } from "./config";
import type { SourceOffers, SourceOfferHistory } from "@/lib/brands/types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Backend request failed (${res.status}): ${path}`);
  }
  return res.json();
}

/** GET /prices/fetch-latest-offers — the most up-to-date offers we have, per source. */
export function fetchLatestOffers(): Promise<SourceOffers[]> {
  return getJson<SourceOffers[]>(PRICES_ENDPOINTS.latest);
}

/** GET /prices/fetch-all-offers — every stored day of offers, per source. */
export function fetchAllOffers(): Promise<SourceOfferHistory[]> {
  return getJson<SourceOfferHistory[]>(PRICES_ENDPOINTS.all);
}
