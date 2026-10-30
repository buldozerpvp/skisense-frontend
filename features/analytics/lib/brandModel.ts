import { getBrand } from "@/features/brands/constants";
import type { SourceOfferHistory, SourceOffers } from "@/features/prices/lib/priceTypes";
import {
  buildSeriesIndex,
  computeMovements,
  DEFAULT_RANK_OPTIONS,
  latestRows,
  marketTrend,
  type SourcedRow,
} from "@/features/analytics/lib/deriveSeries";
import type { DayISO, MarketPoint, Movement, SeriesIndex } from "@/features/analytics/lib/types";

export const nightsFor = (row: { nights?: number; source?: string }, slug?: string): number | undefined => {
  return row.nights ?? getBrand(row.source ?? slug ?? "")?.defaultNights;
};

export const brandLatestRows = (latest: SourceOffers[] | undefined, slug: string): SourcedRow[] => {
  return latestRows(latest).filter((row) => row.source === slug);
};

export const brandSeriesIndex = (history: SourceOfferHistory[] | undefined, slug: string): SeriesIndex => {
  return buildSeriesIndex((history ?? []).filter((source) => source.source === slug));
};

export const brandLastDay = (index: SeriesIndex): DayISO | null => {
  return index.latestDay;
};

export interface ResortSpread {
  key: string;
  resort: string;
  country: string;
  count: number;
  min: number;
  median: number;
  max: number;
  cheapest: SourcedRow;
  priciest: SourcedRow;
  cheapestNights: number;
  priciestNights: number;
}

export const resortSpreads = (rows: SourcedRow[], slug: string): ResortSpread[] => {
  const byResort = new Map<string, { row: SourcedRow; nights: number; perNight: number }[]>();

  for (const row of rows) {
    const nights = nightsFor(row, slug);
    if (!nights) continue;
    const entry = { row, nights, perNight: row.priceEur / nights };
    const bucket = byResort.get(row.resort);
    if (bucket) bucket.push(entry);
    else byResort.set(row.resort, [entry]);
  }

  const spreads: ResortSpread[] = [];
  for (const [resort, entries] of byResort) {
    const sorted = entries.slice().sort((a, b) => a.perNight - b.perNight);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    spreads.push({
      key: `${slug}|${resort}`,
      resort,
      country: low.row.country,
      count: sorted.length,
      min: low.perNight,
      median: medianOf(sorted.map((e) => e.perNight)),
      max: high.perNight,
      cheapest: low.row,
      priciest: high.row,
      cheapestNights: low.nights,
      priciestNights: high.nights,
    });
  }

  return spreads.sort((a, b) => a.median - b.median);
};

const medianOf = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export interface BrandHeadline {
  cheapest: SourcedRow | null;
  cheapestPerNight: number | null;
  medianPerNight: number | null;
  resortCount: number;
  departureCount: number;
  countryCount: number;
  comparableCount: number;
  snapshotDays: number;
  lastNightPct: number | null;
  sinceStartPct: number | null;
  dropCount: number;
  riseCount: number;
  trend: MarketPoint[];
  movements: Movement[];
}

export const brandHeadline = (rows: SourcedRow[], index: SeriesIndex, slug: string): BrandHeadline => {
  const priced = rows
    .map((row) => ({ row, nights: nightsFor(row, slug) }))
    .filter((entry): entry is { row: SourcedRow; nights: number } => Boolean(entry.nights))
    .map(({ row, nights }) => ({ row, nights, perNight: row.priceEur / nights }));

  const cheapest = rows.length > 0 ? rows.reduce((min, r) => (r.priceEur < min.priceEur ? r : min)) : null;
  const cheapestEntry =
    priced.length > 0 ? priced.reduce((min, e) => (e.perNight < min.perNight ? e : min)) : null;

  const trend = marketTrend(index);
  const movements = computeMovements(index);

  const { minAbsEur, minPct } = DEFAULT_RANK_OPTIONS;
  const moved = movements.filter(
    (m) =>
      m.active &&
      !m.isNew &&
      m.deltaPrev !== null &&
      m.pctPrev !== null &&
      Math.abs(m.deltaPrev) >= minAbsEur &&
      Math.abs(m.pctPrev) >= minPct
  );

  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];

  return {
    cheapest,
    cheapestPerNight: cheapestEntry?.perNight ?? null,
    medianPerNight: priced.length > 0 ? medianOf(priced.map((e) => e.perNight)) : null,
    resortCount: new Set(rows.map((r) => r.resort)).size,
    departureCount: rows.length,
    countryCount: new Set(rows.map((r) => r.country)).size,
    comparableCount: priced.length,
    snapshotDays: index.days.length,
    lastNightPct: last && prev ? (last.index / prev.index - 1) * 100 : null,
    sinceStartPct: trend.length > 1 && last ? last.index - 100 : null,
    dropCount: moved.filter((m) => (m.deltaPrev as number) < 0).length,
    riseCount: moved.filter((m) => (m.deltaPrev as number) > 0).length,
    trend,
    movements,
  };
};

export const brandHasData = (rows: SourcedRow[], index: SeriesIndex): boolean => {
  return rows.length > 0 || index.byKey.size > 0;
};
