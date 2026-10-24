import type { OfferStatus, PriceRow } from "@/lib/brands/types";

/** A day in YYYY-MM-DD form, so lexical sort == chronological sort. */
export type DayISO = string;

/** Identity of a tracked offer: the same resort + departure date across snapshots. */
export type OfferKey = string;

/** One observation: what a tracked offer cost on one snapshot day. */
export interface OfferPoint {
  day: DayISO;
  priceEur: number;
  status: OfferStatus;
}

/** One offer's price history across snapshot days. Points are sparse and ascending. */
export interface OfferSeries {
  key: OfferKey;
  source: string;
  resortId: string;
  resort: string;
  country: string;
  /** Departure date, YYYY-MM-DD. */
  departure: DayISO;
  /** Stay length, when the source reports one — part of the offer's identity. */
  nights?: number;
  points: OfferPoint[];
  firstSeen: DayISO;
  lastSeen: DayISO;
  /** Still present in the most recent snapshot (i.e. not sold out / withdrawn). */
  active: boolean;
  /** First appeared in the most recent snapshot, so it has no history to compare. */
  isNew: boolean;
}

/**
 * Every tracked offer's history in one object — the single input the analytics
 * helpers read, so movers, the ladder and the market index can never be
 * computed from differently filtered rows.
 */
export interface SeriesIndex {
  /** Every snapshot day seen, ascending. */
  days: DayISO[];
  /** Row count per snapshot day — keeps an empty scrape visible instead of silently missing. */
  coverage: Map<DayISO, number>;
  byKey: Map<OfferKey, OfferSeries>;
  latestDay: DayISO | null;
}

/** How one offer's price moved. */
export interface Movement {
  key: OfferKey;
  resort: string;
  country: string;
  departure: DayISO;
  status: OfferStatus;
  latest: number;
  /** The offer's own previous observation — not necessarily yesterday. */
  prev: number | null;
  first: number;
  deltaPrev: number | null;
  pctPrev: number | null;
  deltaFirst: number;
  pctFirst: number;
  sampleDays: number;
  isNew: boolean;
  active: boolean;
}

export interface BestPrice {
  key: OfferKey;
  /** Which operator is selling it. */
  source: string;
  resort: string;
  country: string;
  departure: DayISO;
  priceEur: number;
  status: OfferStatus;
  /** Club Med's own "best price" flag — shown as a badge, never used to rank. */
  isGreen: boolean;
}

/** One snapshot day in the market-level trend. */
export interface MarketPoint {
  day: DayISO;
  /** Offers observed that day. */
  n: number;
  /** Plain mean — shown only as faint context; see marketTrend() for why it misleads. */
  meanAll: number | null;
  /** Chained matched-basket index, 100 at the first day. */
  index: number;
  /** Offers shared with the previous day, i.e. the basket the index is computed over. */
  nMatched: number;
}

export type { PriceRow, OfferStatus };
