import { QueryClient } from "@tanstack/react-query";

export const PRICES_STALE_TIME_MS = 5 * 60 * 1000;

export const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PRICES_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
};
