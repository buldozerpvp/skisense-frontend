import type { OfferStatus, PriceRow } from "@/features/prices/lib/priceTypes";

export type DayISO = string;

export type OfferKey = string;

export interface OfferPoint {
  day: DayISO;
  priceEur: number;
  status: OfferStatus;
}

export interface OfferSeries {
  key: OfferKey;
  source: string;
  resortId: string;
  resort: string;
  country: string;
  departure: DayISO;
  nights?: number;
  points: OfferPoint[];
  firstSeen: DayISO;
  lastSeen: DayISO;
  active: boolean;
  isNew: boolean;
}

export interface SeriesIndex {
  days: DayISO[];
  coverage: Map<DayISO, number>;
  byKey: Map<OfferKey, OfferSeries>;
  latestDay: DayISO | null;
}

export interface Movement {
  key: OfferKey;
  resort: string;
  country: string;
  departure: DayISO;
  status: OfferStatus;
  latest: number;
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
  source: string;
  resort: string;
  country: string;
  departure: DayISO;
  priceEur: number;
  status: OfferStatus;
  isGreen: boolean;
}

export interface MarketPoint {
  day: DayISO;
  n: number;
  meanAll: number | null;
  index: number;
  nMatched: number;
}

export type { PriceRow, OfferStatus };
