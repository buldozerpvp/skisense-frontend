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

export const SPARKLINE_WIDTH_PX = 54;
export const SPARKLINE_HEIGHT_PX = 16;
export const SPARKLINE_PADDING_PX = 2;
export const COLUMN_WIDTH = {
  brand: 118,
  resort: 178,
  hotel: 200,
  country: 104,
  dates: 196,
  nights: 66,
  type: 100,
  pax: 72,
  total: 126,
  perPerson: 118,
  change: 142,
  open: 56,
  board: 118,
  flights: 132,
  status: 118,
} as const;

export type ColumnKey = keyof typeof COLUMN_WIDTH;

export const WIDTH_KEY_BY_COLUMN_ID: Record<string, ColumnKey> = {
  open: "open",
  resort: "resort",
  hotel: "hotel",
  total: "total",
  perPerson: "perPerson",
  date: "dates",
  nights: "nights",
  change: "change",
  brandSlug: "brand",
  board: "board",
  flights: "flights",
  country: "country",
  propertyType: "type",
  pax: "pax",
  status: "status",
};

export const FILTER_ROW_WIDTH: Partial<Record<ColumnKey, number>> = {
  brand: 124,
  resort: 182,
  hotel: 208,
  country: 108,
  dates: 336,
  nights: 78,
  type: 106,
  pax: 78,
  total: 204,
  open: 64,
  status: 126,
};
export const FILTER_ROW_ATTR = "data-filter-row";
export const ROW_HEIGHT_PX = 58;
export const ROW_OVERSCAN = 4;
export const GLASS_BLUR = "blur(10px) saturate(140%)";
export const HEADER_HEIGHT_PX = { withFilters: 104, bare: 0 } as const;
export const HEADER_CONTENT_MIN_PX = { withFilters: 30, bare: 0 } as const;
export const BOTTOM_BAR_MIN_PX = 32;

export const COLUMN_ORDER = [
  "open",
  "resort",
  "hotel",
  "total",
  "perPerson",
  "date",
  "nights",
  "change",
  "brandSlug",
  "board",
  "flights",
  "country",
  "propertyType",
  "pax",
  "status",
];

export const UNCHANGED_PCT = 0.05;

export const PRICE_COLUMNS = ["total", "perPerson"];
export const PINNED_COLUMNS = ["open"];
export const PRICE_TINT_PCT = { head: 13, body: 6 } as const;

export const PAGE_SIZE = 25;
export const SCROLL_CHUNK = 50;
export const SEARCH_SETTLE_MS = 60;
export const SCROLL_REACH_PX = 320;
