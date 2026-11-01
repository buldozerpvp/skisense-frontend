import { API_BASE_URL, HISTORY_IDLE_TIMEOUT_MS, PRICES_ENDPOINTS } from "@/features/prices/constants";
import type { SourceOffers, SourceOfferHistory } from "@/features/prices/lib/priceTypes";
import { isPackedHistory, unpackHistory, type PackedHistory } from "@/features/prices/lib/historyCodec";

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

const afterFirstPaint = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !window.requestIdleCallback) {
      resolve();
      return;
    }
    window.requestIdleCallback(() => resolve(), { timeout: HISTORY_IDLE_TIMEOUT_MS });
  });

export const fetchAllOffers = async (): Promise<SourceOfferHistory[]> => {
  await afterFirstPaint();
  const body = await getJson<SourceOfferHistory[] | PackedHistory>(PRICES_ENDPOINTS.all);
  return isPackedHistory(body) ? unpackHistory(body) : body;
};
