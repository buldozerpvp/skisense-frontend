import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // mock data never changes server-side
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
