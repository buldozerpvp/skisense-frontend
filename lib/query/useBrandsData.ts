"use client";

import { useQuery } from "@tanstack/react-query";
import type { BrandData } from "@/lib/brands/types";

async function fetchBrands(): Promise<BrandData[]> {
  const res = await fetch("/api/brands");
  if (!res.ok) throw new Error("Failed to load brands data");
  return res.json();
}

/**
 * Single shared query — the brand cards, the combined table, and the
 * charts section all call this hook. Same queryKey means TanStack Query
 * dedupes them into one fetch / one cache entry, not three.
 */
export function useBrandsData() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });
}
