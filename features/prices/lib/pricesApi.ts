import { API_BASE_URL, PRICES_ENDPOINTS } from "@/features/prices/constants";
import type { SourceOffers, SourceOfferHistory } from "@/features/prices/lib/priceTypes";

const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Backend request failed (${res.status}): ${path}`);
  }
  return res.json();
};

export const fetchLatestOffers = (): Promise<SourceOffers[]> => {
  return getJson<SourceOffers[]>(PRICES_ENDPOINTS.latest);
};

export const fetchAllOffers = (): Promise<SourceOfferHistory[]> => {
  return getJson<SourceOfferHistory[]>(PRICES_ENDPOINTS.all);
};
