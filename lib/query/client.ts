import { QueryClient } from "@tanstack/react-query";

/**
 * How long a price response counts as fresh. The collector publishes once a
 * night, so a shorter window only re-fetches an identical payload; shared with
 * the hooks in usePrices.ts so the table and the charts can't drift into
 * refetching at different moments and disagreeing about the data.
 */
export const PRICES_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * A client per browser session, built in Providers rather than at module
 * scope so one request's cache can never be handed to another visitor.
 *
 * One retry only: the way these queries fail (no database and no local
 * backend) fails the same way the second time, and a retry storm just delays
 * the error state the table wants to show.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PRICES_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
