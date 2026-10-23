import { getBrand } from "@/lib/brands/config";
import type { SourceOfferHistory, SourceOffers } from "@/lib/brands/types";
import {
  buildSeriesIndex,
  computeMovements,
  DEFAULT_RANK_OPTIONS,
  latestRows,
  marketTrend,
  type SourcedRow,
} from "./derive";
import type { DayISO, MarketPoint, Movement, SeriesIndex } from "./types";

/**
 * Brand-scoped shaping for the per-operator analytics section.
 *
 * Everything here answers one question about one operator — what does it cost,
 * where does it sell, what has it been doing lately — so every helper takes the
 * slug and filters on `source` itself. Nothing in here reshapes the market-wide
 * derivations; it narrows the input and then calls them, so a brand page and
 * the homepage can never disagree about what a "price move" is.
 */

/**
 * Stay length for a row, falling back to the operator's fixed duration where it
 * has one (Club Med always sells 7 nights). Same rule as SeasonCurve — package
 * prices across different stay lengths are not comparable, so a row where
 * neither resolves is dropped rather than guessed.
 */
export function nightsFor(row: { nights?: number; source?: string }, slug?: string): number | undefined {
  return row.nights ?? getBrand(row.source ?? slug ?? "")?.defaultNights;
}

/** The latest snapshot, narrowed to one operator. */
export function brandLatestRows(latest: SourceOffers[] | undefined, slug: string): SourcedRow[] {
  return latestRows(latest).filter((row) => row.source === slug);
}

/** The operator's own history, folded into the same index shape the market uses. */
export function brandSeriesIndex(history: SourceOfferHistory[] | undefined, slug: string): SeriesIndex {
  return buildSeriesIndex((history ?? []).filter((source) => source.source === slug));
}

/** The snapshot day the operator last published, as YYYY-MM-DD. */
export function brandLastDay(index: SeriesIndex): DayISO | null {
  return index.latestDay;
}

/** One resort's price range within this operator's current offer list. */
export interface ResortSpread {
  /** Stable id for React keys and the band scale — never an array index. */
  key: string;
  resort: string;
  country: string;
  /** Departures priced for this resort in the latest snapshot. */
  count: number;
  /** Price per person per night — min, median, max across those departures. */
  min: number;
  median: number;
  max: number;
  /** The actual cheapest and priciest departures behind min and max. */
  cheapest: SourcedRow;
  priciest: SourcedRow;
  /** Nights behind the cheapest departure, so the tooltip can show the basis. */
  cheapestNights: number;
  priciestNights: number;
}

/**
 * Per-resort price spread for one operator, sorted cheapest median first.
 *
 * Grouped by resort *name*, not resortId: Pingwin and Skideal encode the stay
 * length into the id ("752-7n"), so grouping by id would split one hotel into a
 * 3-night row and a 7-night row and make the chart look like twice the coverage.
 */
export function resortSpreads(rows: SourcedRow[], slug: string): ResortSpread[] {
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
}

/** Median of an already-sorted-or-not numeric list. Empty list returns 0. */
function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The headline figures above the brand's charts. */
export interface BrandHeadline {
  /** Cheapest departure in the latest snapshot, by total package price. */
  cheapest: SourcedRow | null;
  cheapestPerNight: number | null;
  /** Typical price per person per night across every comparable departure. */
  medianPerNight: number | null;
  resortCount: number;
  departureCount: number;
  countryCount: number;
  /** Departures whose stay length resolves, i.e. the ones the charts can price. */
  comparableCount: number;
  snapshotDays: number;
  /**
   * Matched-basket move since the previous price check, in percent. Null until
   * the operator has two snapshots to compare — never 0, which would read as
   * "we checked and nothing moved".
   */
  lastNightPct: number | null;
  /** Same, measured against the first snapshot we hold. */
  sinceStartPct: number | null;
  /** Departures that moved by more than the usual noise floor since last night. */
  dropCount: number;
  riseCount: number;
  trend: MarketPoint[];
  movements: Movement[];
}

/**
 * Levels from the latest snapshot, movement from the operator's own history.
 *
 * Split that way on purpose: a brand with a single snapshot day still gets every
 * level figure, and only the movement fields come back null — which is what lets
 * the section degrade to "levels only" instead of disappearing.
 */
export function brandHeadline(rows: SourcedRow[], index: SeriesIndex, slug: string): BrandHeadline {
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
}

/** True when the operator has nothing at all to show — render nothing, not empty cards. */
export function brandHasData(rows: SourcedRow[], index: SeriesIndex): boolean {
  return rows.length > 0 || index.byKey.size > 0;
}
