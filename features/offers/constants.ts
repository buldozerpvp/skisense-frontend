import type { OfferFilters, OfferSort } from "@/features/offers/lib/offerModel";

export const SORT_LABEL: Record<OfferSort, string> = {
  cheapest: "Cheapest",
  dearest: "Most expensive",
  drop: "Biggest drop",
  soonest: "Soonest",
};

export const DEFAULT_FILTERS: OfferFilters = {
  query: "",
  resorts: null,
  hotels: null,
  countries: null,
  brands: null,
  types: ["hotel", "club"],
  party: "any",
  nights: null,
  from: null,
  to: null,
  maxTotal: null,
  maxPerPerson: null,
  change: "any",
  status: "any",
  flights: ["included"],
  board: null,
  sort: "cheapest",
};

export const FILTERS_COUNTED_AS_ACTIVE: (keyof OfferFilters)[] = [
  "resorts", "hotels", "countries", "brands", "types",
  "party", "nights", "from", "to", "maxTotal", "maxPerPerson", "change", "status", "flights", "board",
];
