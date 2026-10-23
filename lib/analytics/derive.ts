import type { PriceRow, SourceOfferHistory, SourceOffers } from "@/lib/brands/types";
import type {
  BestPrice,
  DayISO,
  MarketPoint,
  Movement,
  OfferKey,
  OfferSeries,
  SeriesIndex,
} from "./types";

/** Snapshot days arrive as DD-MM-YYYY; everything downstream wants YYYY-MM-DD. */
export function toIsoDay(ddmmyyyy: string): DayISO {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Identity of a tracked offer. `nights` is part of the key on purpose: Pingwin
 * and Skideal sell 3-, 4- and 7-night packages for the same resort and date, so
 * leaving it out would merge two packages into one series and report the swap
 * between them as a price move.
 */
export function offerKey(
  source: string,
  resortId: string,
  departure: string,
  nights?: number
): OfferKey {
  return `${source}|${resortId}|${departure}|${nights ?? "?"}`;
}

/**
 * Folds every stored snapshot into one offer-keyed index in a single pass
 * (Map get-or-create, never a nested find — 712 rows x N days adds up fast).
 */
export function buildSeriesIndex(history: SourceOfferHistory[] | undefined): SeriesIndex {
  const byKey = new Map<OfferKey, OfferSeries>();
  const coverage = new Map<DayISO, number>();
  const daySet = new Set<DayISO>();

  for (const source of history ?? []) {
    for (const snapshot of source.days) {
      const day = toIsoDay(snapshot.day);
      daySet.add(day);
      coverage.set(day, (coverage.get(day) ?? 0) + snapshot.data.length);

      for (const row of snapshot.data) {
        const key = offerKey(source.source, row.resortId, row.date, row.nights);
        let series = byKey.get(key);
        if (!series) {
          series = {
            key,
            source: source.source,
            resortId: row.resortId,
            resort: row.resort,
            country: row.country,
            departure: row.date,
            nights: row.nights,
            points: [],
            firstSeen: day,
            lastSeen: day,
            active: false,
            isNew: false,
          };
          byKey.set(key, series);
        }
        // Same key twice in one day shouldn't happen; last write wins if it does.
        const existing = series.points.find((p) => p.day === day);
        if (existing) {
          existing.priceEur = row.priceEur;
          existing.status = row.status;
        } else {
          series.points.push({ day, priceEur: row.priceEur, status: row.status });
        }
        if (day < series.firstSeen) series.firstSeen = day;
        if (day > series.lastSeen) series.lastSeen = day;
      }
    }
  }

  const days = [...daySet].sort();
  const latestDay = days.length > 0 ? days[days.length - 1] : null;

  for (const series of byKey.values()) {
    series.points.sort((a, b) => a.day.localeCompare(b.day));
    series.active = latestDay !== null && series.lastSeen === latestDay;
    series.isNew = latestDay !== null && series.firstSeen === latestDay && series.points.length === 1;
  }

  return { days, coverage, byKey, latestDay };
}

/**
 * Price movement per offer. `prev` is the offer's own previous observation rather
 * than "yesterday", so a gap in coverage doesn't fabricate a jump.
 */
export function computeMovements(index: SeriesIndex): Movement[] {
  const movements: Movement[] = [];

  for (const series of index.byKey.values()) {
    const points = series.points;
    if (points.length === 0) continue;

    const last = points[points.length - 1];
    const prevPoint = points.length > 1 ? points[points.length - 2] : null;
    const first = points[0];

    const deltaPrev = prevPoint ? last.priceEur - prevPoint.priceEur : null;
    const deltaFirst = last.priceEur - first.priceEur;

    movements.push({
      key: series.key,
      resort: series.resort,
      country: series.country,
      departure: series.departure,
      status: last.status,
      latest: last.priceEur,
      prev: prevPoint?.priceEur ?? null,
      first: first.priceEur,
      deltaPrev,
      pctPrev: prevPoint && prevPoint.priceEur > 0 ? ((deltaPrev as number) / prevPoint.priceEur) * 100 : null,
      deltaFirst,
      pctFirst: first.priceEur > 0 ? (deltaFirst / first.priceEur) * 100 : 0,
      sampleDays: points.length,
      isNew: series.isNew,
      active: series.active,
    });
  }

  return movements;
}

export interface RankOptions {
  /** Ignore moves smaller than this in euros — €5 on a €4,000 package isn't news. */
  minAbsEur?: number;
  /** ...and smaller than this in percent, which kills noise on cheap packages too. */
  minPct?: number;
  limit?: number;
  /** "prev" = since the last snapshot (the actionable signal). "first" = since we started tracking. */
  basis?: "prev" | "first";
}

export const DEFAULT_RANK_OPTIONS: Required<Omit<RankOptions, "basis">> = {
  minAbsEur: 25,
  minPct: 2,
  limit: 8,
};

/** Biggest drops (or rises), noise-filtered and sorted by percentage so scale doesn't dominate. */
export function rankMovers(
  movements: Movement[],
  direction: "drop" | "rise",
  options: RankOptions = {}
): Movement[] {
  const { minAbsEur, minPct, limit } = { ...DEFAULT_RANK_OPTIONS, ...options };
  const basis = options.basis ?? "prev";
  const sign = direction === "drop" ? -1 : 1;

  return movements
    .filter((m) => {
      if (!m.active || m.isNew) return false; // sold out or brand new: not a price move
      const delta = basis === "prev" ? m.deltaPrev : m.deltaFirst;
      const pct = basis === "prev" ? m.pctPrev : m.pctFirst;
      if (delta === null || pct === null) return false;
      if (Math.sign(delta) !== sign) return false;
      return Math.abs(delta) >= minAbsEur && Math.abs(pct) >= minPct;
    })
    .sort((a, b) => {
      const pctA = Math.abs((basis === "prev" ? a.pctPrev : a.pctFirst) ?? 0);
      const pctB = Math.abs((basis === "prev" ? b.pctPrev : b.pctFirst) ?? 0);
      if (pctB !== pctA) return pctB - pctA;
      const deltaA = Math.abs((basis === "prev" ? a.deltaPrev : a.deltaFirst) ?? 0);
      const deltaB = Math.abs((basis === "prev" ? b.deltaPrev : b.deltaFirst) ?? 0);
      return deltaB - deltaA;
    })
    .slice(0, limit);
}

/**
 * Flattens the latest snapshot into rows that remember which operator they came
 * from — charts need it to name the seller and to link back to the table.
 */
export function latestRows(latest: SourceOffers[] | undefined): SourcedRow[] {
  return (latest ?? []).flatMap((s) => s.data.map((row) => ({ ...row, source: s.source })));
}

function toBestPrice(source: string, row: PriceRow): BestPrice {
  return {
    key: offerKey(source, row.resortId, row.date, row.nights),
    source,
    resort: row.resort,
    country: row.country,
    departure: row.date,
    priceEur: row.priceEur,
    status: row.status,
    isGreen: row.status === "green",
  };
}

/**
 * The cheapest departure for each resort — 16 comparable entries. Cheapest-overall
 * would just list the same two budget resorts over and over.
 */
export function bestPerResort(latest: SourceOffers[] | undefined): BestPrice[] {
  const cheapest = new Map<string, BestPrice>();
  for (const source of latest ?? []) {
    for (const row of source.data) {
      const current = cheapest.get(row.resort);
      if (!current || row.priceEur < current.priceEur) {
        cheapest.set(row.resort, toBestPrice(source.source, row));
      }
    }
  }
  return [...cheapest.values()].sort((a, b) => a.priceEur - b.priceEur);
}

/** The n cheapest offers overall, for the "best price right now" tile. */
export function bestOverall(latest: SourceOffers[] | undefined, n = 5): BestPrice[] {
  return (latest ?? [])
    .flatMap((source) => source.data.map((row) => toBestPrice(source.source, row)))
    .sort((a, b) => a.priceEur - b.priceEur)
    .slice(0, n);
}

/**
 * Market trend as a chained matched-basket index.
 *
 * A plain average across all offers is a composition index, not a price index:
 * when cheap departures sell out the mean jumps even though nothing got more
 * expensive. So each step averages per-offer price *ratios* over the offers
 * present on both days, and those ratios chain into an index starting at 100.
 */
export function marketTrend(index: SeriesIndex): MarketPoint[] {
  const { days } = index;
  if (days.length === 0) return [];

  const pricesByDay = new Map<DayISO, Map<OfferKey, number>>();
  for (const day of days) pricesByDay.set(day, new Map());
  for (const series of index.byKey.values()) {
    for (const point of series.points) {
      pricesByDay.get(point.day)?.set(series.key, point.priceEur);
    }
  }

  const points: MarketPoint[] = [];
  let runningIndex = 100;

  days.forEach((day, i) => {
    const today = pricesByDay.get(day) ?? new Map<OfferKey, number>();
    const prices = [...today.values()];
    const meanAll = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : null;

    let nMatched = 0;
    if (i > 0) {
      const yesterday = pricesByDay.get(days[i - 1]) ?? new Map<OfferKey, number>();
      let ratioSum = 0;
      for (const [key, price] of today) {
        const before = yesterday.get(key);
        if (before && before > 0) {
          ratioSum += price / before;
          nMatched += 1;
        }
      }
      // No overlap (e.g. an empty scrape) carries the index forward unchanged
      // rather than inventing a move.
      if (nMatched > 0) runningIndex *= ratioSum / nMatched;
    }

    points.push({ day, n: prices.length, meanAll, index: runningIndex, nMatched });
  });

  return points;
}


/** A latest-snapshot row that still knows its operator. */
export type SourcedRow = PriceRow & { source: string };

/** One resort's position in the cheapest-resorts ranking on one snapshot day. */
export interface LadderPoint {
  day: DayISO;
  rank: number;
  priceEur: number;
}

export interface LadderSeries {
  resortId: string;
  resort: string;
  country: string;
  /**
   * Ascending by day, and deliberately sparse: a resort that drops out of the
   * top N gets no point for that day rather than an invented rank.
   */
  points: LadderPoint[];
}

/**
 * The cheapest offer per resort on each snapshot day, ranked 1..topN.
 *
 * Ranking resorts rather than individual offers keeps the line count readable
 * (~24 resorts, not ~700 offers) and sidesteps the composition problem that
 * makes raw averages misleading: a rank is a comparison made *within* one day.
 */
export function rankLadder(index: SeriesIndex, topN = 10): { days: DayISO[]; series: LadderSeries[] } {
  const { days } = index;
  const cheapestByDay = new Map<DayISO, Map<string, { resort: string; country: string; priceEur: number }>>();
  for (const day of days) cheapestByDay.set(day, new Map());

  for (const series of index.byKey.values()) {
    for (const point of series.points) {
      const bucket = cheapestByDay.get(point.day);
      if (!bucket) continue;
      const current = bucket.get(series.resort);
      if (!current || point.priceEur < current.priceEur) {
        bucket.set(series.resort, {
          resort: series.resort,
          country: series.country,
          priceEur: point.priceEur,
        });
      }
    }
  }

  const byResort = new Map<string, LadderSeries>();
  for (const day of days) {
    const ranked = [...(cheapestByDay.get(day) ?? new Map())].sort(
      (a, b) => a[1].priceEur - b[1].priceEur
    );
    ranked.forEach(([resortId, meta], i) => {
      const rank = i + 1;
      if (rank > topN) return;
      let series = byResort.get(resortId);
      if (!series) {
        series = { resortId, resort: meta.resort, country: meta.country, points: [] };
        byResort.set(resortId, series);
      }
      series.points.push({ day, rank, priceEur: meta.priceEur });
    });
  }

  return { days, series: [...byResort.values()] };
}

/**
 * The index as it stood on a given day — everything downstream (movements,
 * movers, the ladder, the market index) then describes that day, which is what
 * the snapshot scrubber plays back.
 */
export function sliceIndex(index: SeriesIndex, upTo: DayISO): SeriesIndex {
  const days = index.days.filter((d) => d <= upTo);
  const latestDay = days.length > 0 ? days[days.length - 1] : null;
  const byKey = new Map<OfferKey, OfferSeries>();

  for (const [key, series] of index.byKey) {
    const points = series.points.filter((p) => p.day <= upTo);
    if (points.length === 0) continue;
    const lastSeen = points[points.length - 1].day;
    byKey.set(key, {
      ...series,
      points,
      firstSeen: points[0].day,
      lastSeen,
      active: latestDay !== null && lastSeen === latestDay,
      isNew: latestDay !== null && points[0].day === latestDay && points.length === 1,
    });
  }

  const coverage = new Map([...index.coverage].filter(([day]) => day <= upTo));
  return { days, coverage, byKey, latestDay };
}
