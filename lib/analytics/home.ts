import { getBrand } from "@/lib/brands/config";
import { paxOf, totalPrice } from "@/lib/table/pricing";
import { toIsoDay } from "./derive";
import type { DayISO } from "./types";
import type { OfferStatus, PriceRow, SourceOfferHistory } from "@/lib/brands/types";

/**
 * The home page's analytics model.
 *
 * One fold, one shape, three cards — the old section derived each card from a
 * slightly different slice and they could disagree about how many prices moved.
 * Everything here is built from the stored history alone, whose newest day per
 * source *is* the latest snapshot, so "what's cheap now" and "what changed" are
 * two views of the same rows.
 *
 * Two rules the rest of the file exists to enforce:
 *
 * 1. **Money is the total the booking costs.** Operators quote per person for a
 *    party of two or three; `totalPrice()` multiplies it back up. The per-person
 *    figure is never shown as a headline — nobody pays it.
 * 2. **Comparisons are per night.** Issta sells 3-night breaks and Club Med sells
 *    weeks; on total price the short break always wins and the chart would just
 *    be ranking stay length.
 */

/** Ignore moves under this: €40 on a €7,000 week is not news. Totals, not per person. */
export const NOISE_FLOOR = { minAbsEur: 50, minPct: 2 } as const;

export interface HomeOffer {
  /** Unique per offer: operator, property, departure and stay length. */
  key: string;
  source: string;
  resort: string;
  country: string;
  hotel?: string;
  board?: string;
  url?: string;
  departure: DayISO;
  nights: number;
  pax: number;
  /** What the booking costs in total at its newest observation. */
  total: number;
  /** That total divided by nights — the only basis on which operators compare. */
  perNight: number;
  status: OfferStatus;
  firstDay: DayISO;
  lastDay: DayISO;
  /** The same booking's total at its own previous observation, not "yesterday". */
  prevTotal: number | null;
  /** Signed change in total since that observation. */
  delta: number | null;
  pct: number | null;
  /** Still quoted in its own operator's newest snapshot — operators don't all
   *  collect on the same night, so a global "latest day" would mark five of six
   *  sources sold out. */
  active: boolean;
  /** First seen in its operator's newest snapshot, so it has nothing to compare to. */
  isNew: boolean;
}

export interface HomeSummary {
  /** Active offers that fell by more than the noise floor. */
  cheaper: number;
  dearer: number;
  /** Active offers that had a previous price to compare against at all. */
  rechecked: number;
  /** The newest snapshot day anywhere in the data. */
  lastCheck: DayISO | null;
}

export interface HomeModel {
  /** Every snapshot day seen, ascending. */
  days: DayISO[];
  /** Offers still on sale, cheapest per night first. */
  offers: HomeOffer[];
  /** Everything that moved by more than the noise floor, biggest move first. */
  movers: HomeOffer[];
  summary: HomeSummary;
}

/**
 * Identity of a tracked booking.
 *
 * `hotel` and `nights` are part of it because they are part of what you buy:
 * Issta lists four Bansko rooms under one resort id, and Pingwin sells 3- and
 * 7-night packages for the same hotel and date. Merge either and the swap
 * between two products is reported as a price move.
 */
function homeKey(source: string, row: PriceRow): string {
  return [source, row.resortId, row.hotel ?? "", row.date, row.nights ?? "?"].join("|");
}

/** Stay length, falling back to the operator's fixed duration (Club Med always
 *  sells 7 nights). Rows where neither resolves are dropped, never guessed. */
function nightsFor(source: string, row: PriceRow): number | undefined {
  return row.nights ?? getBrand(source)?.defaultNights;
}

interface Observation {
  day: DayISO;
  total: number;
  row: PriceRow;
}

/**
 * Folds every stored snapshot into one offer per booking.
 *
 * `upTo` is the snapshot scrubber: passing a day rebuilds the whole model as it
 * stood that night, so all three cards rewind together rather than one at a time.
 */
export function buildHomeModel(
  history: SourceOfferHistory[] | undefined,
  upTo?: DayISO | null
): HomeModel {
  const daySet = new Set<DayISO>();
  const series = new Map<string, { source: string; observations: Observation[] }>();
  /** Each operator's own newest collection day — see `active` above. */
  const lastDayBySource = new Map<string, DayISO>();

  for (const source of history ?? []) {
    for (const snapshot of source.days) {
      const day = toIsoDay(snapshot.day);
      if (upTo && day > upTo) continue;
      daySet.add(day);

      // An empty scrape is a failed scrape, not "everything sold out", so it
      // doesn't get to become this source's newest day.
      if (snapshot.data.length > 0) {
        const current = lastDayBySource.get(source.source);
        if (!current || day > current) lastDayBySource.set(source.source, day);
      }

      for (const row of snapshot.data) {
        if (!nightsFor(source.source, row)) continue;
        const key = homeKey(source.source, row);
        let entry = series.get(key);
        if (!entry) {
          entry = { source: source.source, observations: [] };
          series.set(key, entry);
        }
        const total = totalPrice(row);
        // The same key can repeat within a day when an operator lists several
        // room grades under one id. Keep the cheapest rather than whichever
        // landed last, so the tracked number is deterministic across snapshots.
        const existing = entry.observations.find((o) => o.day === day);
        if (existing) {
          if (total < existing.total) {
            existing.total = total;
            existing.row = row;
          }
        } else {
          entry.observations.push({ day, total, row });
        }
      }
    }
  }

  const days = [...daySet].sort();
  const offers: HomeOffer[] = [];

  for (const [key, entry] of series) {
    const observations = entry.observations.sort((a, b) => a.day.localeCompare(b.day));
    const last = observations[observations.length - 1];
    const previous = observations.length > 1 ? observations[observations.length - 2] : null;
    const nights = nightsFor(entry.source, last.row) as number;

    const sourceLastDay = lastDayBySource.get(entry.source) ?? null;
    const active = sourceLastDay !== null && last.day === sourceLastDay;
    const delta = previous ? last.total - previous.total : null;

    offers.push({
      key,
      source: entry.source,
      resort: last.row.resort,
      country: last.row.country,
      hotel: last.row.hotel,
      board: last.row.board,
      url: last.row.url,
      departure: last.row.date,
      nights,
      pax: paxOf(last.row),
      total: last.total,
      perNight: last.total / nights,
      status: last.row.status,
      firstDay: observations[0].day,
      lastDay: last.day,
      prevTotal: previous?.total ?? null,
      delta,
      pct: previous && previous.total > 0 ? ((delta as number) / previous.total) * 100 : null,
      active,
      isNew: active && observations.length === 1,
    });
  }

  const live = offers.filter((offer) => offer.active);
  live.sort((a, b) => a.perNight - b.perNight);

  const moved = live.filter(
    (offer) =>
      offer.delta !== null &&
      offer.pct !== null &&
      Math.abs(offer.delta) >= NOISE_FLOOR.minAbsEur &&
      Math.abs(offer.pct) >= NOISE_FLOOR.minPct
  );

  return {
    days,
    offers: live,
    movers: moved
      .slice()
      .sort((a, b) => Math.abs(b.pct as number) - Math.abs(a.pct as number)),
    summary: {
      cheaper: moved.filter((offer) => (offer.delta as number) < 0).length,
      dearer: moved.filter((offer) => (offer.delta as number) > 0).length,
      rechecked: live.filter((offer) => offer.prevTotal !== null).length,
      lastCheck: days.length > 0 ? days[days.length - 1] : null,
    },
  };
}

/**
 * The biggest drops and the biggest rises in one list, drops first.
 *
 * Both halves share one chart because they share one question. Ranking by
 * percentage rather than euros keeps a €200 cut on a Bulgarian long weekend in
 * the running against a €2,000 swing on a Val d'Isère week.
 */
export function topMoves(movers: HomeOffer[], perSide = 6): HomeOffer[] {
  const drops = pickDiverse(movers.filter((m) => (m.delta as number) < 0), perSide);
  const rises = pickDiverse(movers.filter((m) => (m.delta as number) > 0), perSide);
  // Signed sort: the list sweeps from the deepest cut through zero to the
  // steepest rise, so the shape of the card is the shape of the market.
  return [...drops, ...rises].sort((a, b) => (a.pct as number) - (b.pct as number));
}

/**
 * At most two rows per resort.
 *
 * Operators reprice a whole resort at once, so an unfiltered ranking is six
 * consecutive Québec Charlevoix weeks that all moved by the same amount — six
 * rows spent telling the reader one fact.
 */
function pickDiverse(movers: HomeOffer[], limit: number, perResort = 2): HomeOffer[] {
  const picked: HomeOffer[] = [];
  const seen = new Map<string, number>();
  for (const mover of movers) {
    if (picked.length >= limit) break;
    const count = seen.get(mover.resort) ?? 0;
    if (count >= perResort) continue;
    seen.set(mover.resort, count + 1);
    picked.push(mover);
  }
  // Rather than return a short list when one resort moved and nothing else did.
  if (picked.length < limit) {
    for (const mover of movers) {
      if (picked.length >= limit) break;
      if (!picked.includes(mover)) picked.push(mover);
    }
  }
  return picked;
}

export interface ResortLevel {
  resort: string;
  country: string;
  /** Offers on sale at this resort. */
  n: number;
  /** The cheapest booking here — the one the row is sorted and labelled by. */
  cheapest: HomeOffer;
  cheapestPerNight: number;
  /** Where the middle of this resort's prices sits; the bar runs cheapest -> here. */
  typicalPerNight: number;
}

/** One row per resort, cheapest first. The question is "where", so the unit is
 *  the resort, not the offer — otherwise one cheap resort fills the whole card. */
export function resortLevels(offers: HomeOffer[], limit = 12): ResortLevel[] {
  const byResort = new Map<string, HomeOffer[]>();
  for (const offer of offers) {
    const bucket = byResort.get(offer.resort);
    if (bucket) bucket.push(offer);
    else byResort.set(offer.resort, [offer]);
  }

  return [...byResort.entries()]
    .map(([resort, list]) => {
      const sorted = list.slice().sort((a, b) => a.perNight - b.perNight);
      const cheapest = sorted[0];
      return {
        resort,
        country: cheapest.country,
        n: sorted.length,
        cheapest,
        cheapestPerNight: cheapest.perNight,
        typicalPerNight: medianOf(sorted.map((o) => o.perNight)),
      };
    })
    .sort((a, b) => a.cheapestPerNight - b.cheapestPerNight)
    .slice(0, limit);
}

export interface SeasonWeek {
  /** Monday of the departure week, YYYY-MM-DD. */
  weekStart: DayISO;
  n: number;
  cheapestPerNight: number;
  /**
   * Lower quartile, i.e. the top of the *affordable* quarter of that week's
   * bookings. The median is in `typicalPerNight` for the table, but it can't be
   * the band's edge: Club Med's luxury weeks drag it four times above the
   * cheapest line, and the resulting band buries the shape of the season.
   */
  budgetPerNight: number;
  typicalPerNight: number;
  /** The booking behind `cheapestPerNight`, for the callout and the table. */
  cheapest: HomeOffer;
}

/**
 * The season in weekly buckets.
 *
 * Per departure *week*, not per departure date: operators depart on different
 * weekdays, and a per-date series is a comb of one-offer spikes that hides the
 * shape of the season — which is the only thing this card is for.
 */
export function seasonWeeks(offers: HomeOffer[], minPerWeek = 2): SeasonWeek[] {
  const byWeek = new Map<DayISO, HomeOffer[]>();
  for (const offer of offers) {
    const week = weekStartOf(offer.departure);
    const bucket = byWeek.get(week);
    if (bucket) bucket.push(offer);
    else byWeek.set(week, [offer]);
  }

  return [...byWeek.entries()]
    // A week represented by a single offer is an anecdote; it would put a spike
    // in the band that no amount of smoothing makes honest.
    .filter(([, list]) => list.length >= minPerWeek)
    .map(([weekStart, list]) => {
      const sorted = list.slice().sort((a, b) => a.perNight - b.perNight);
      const prices = sorted.map((o) => o.perNight);
      return {
        weekStart,
        n: sorted.length,
        cheapest: sorted[0],
        cheapestPerNight: prices[0],
        budgetPerNight: quantileOf(prices, 0.25),
        typicalPerNight: medianOf(prices),
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Monday of the week a departure falls in, computed in UTC so it never shifts. */
function weekStartOf(day: DayISO): DayISO {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

/** Median of an already-ascending list. */
function medianOf(sorted: number[]): number {
  return quantileOf(sorted, 0.5);
}

/** Linear-interpolated quantile of an already-ascending list. */
function quantileOf(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}
