export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const PRICES_ENDPOINTS = API_BASE_URL
  ? ({
      latest: "/prices/fetch-latest-offers",
      all: "/prices/fetch-all-offers",
    } as const)
  : ({
      latest: "/api/prices/latest",
      all: "/api/prices/all",
    } as const);
