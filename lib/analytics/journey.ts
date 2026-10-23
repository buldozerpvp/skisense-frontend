import { quantile } from "d3-array";
import type { DayISO, OfferKey, OfferSeries, SeriesIndex } from "./types";

/**
 * Shaping for the price journey — every tracked offer's path from the night we
 * first saw it to now.
 *
 * The one decision that makes this chart work: the vertical axis is each
 * offer's change *against its own first observed price*, not the price itself.
 * Package prices here run from about €700 to over €10,000, so on an absolute
 * axis every path is a flat horizontal thread and the movement — the whole
 * point — is invisible. Indexing each offer to where it started puts a €900
 * week and a €9,000 week on the same axis, makes the zero line mean "nothing
 * has happened", and makes the picture literally a journey: everything leaves
 * from one place and fans out over the nights.
 *
 * Nothing here is summed across offers. The total of a set of unrelated holiday
 * packages isn't a quantity, so there is no stacking and no area that stands
 * for a mass of money; the shaded band is a *percentile range* of individual
 * changes, which survives offers appearing and selling out.
 */

export interface JourneyPoint {
  day: DayISO;
  /** Position of `day` in the journey's day list — the x slot. */
  dayIndex: number;
  priceEur: number;
  /** Change against this offer's first observed price, in percent. */
  pct: number;
  /** Euro change against this offer's first observed price. */
  deltaEur: number;
}

export type JourneyDirection = "drop" | "rise" | "flat";

export interface JourneyPath {
  key: OfferKey;
  source: string;
  resort: string;
  country: string;
  departure: DayISO;
  nights?: number;
  /** Ascending, one per night this offer was actually observed. Never filled in. */
  points: JourneyPoint[];
  firstDay: DayISO;
  firstPrice: number;
  lastDay: DayISO;
  lastPrice: number;
  netEur: number;
  netPct: number;
  /** The largest move away from the start at any point, in percent — an offer
   *  that dropped and bounced back still had a journey. */
  swingPct: number;
  direction: JourneyDirection;
  /** Present in the most recent snapshot. */
  active: boolean;
  /** Last seen before the most recent snapshot: sold out or withdrawn. */
  gone: boolean;
}

/** The spread of changes across all offers that had history on one night. */
export interface JourneyDay {
  day: DayISO;
  dayIndex: number;
  /** Offers contributing to this night's spread. */
  n: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

export interface JourneyCounts {
  /** Offers with at least two observations — the ones that have a journey. */
  tracked: number;
  moved: number;
  cheaper: number;
  pricier: number;
  unchanged: number;
  /** First seen on the latest night, so they have nothing to compare yet. */
  joinedToday: number;
  /** Last seen before the latest night — sold out or pulled. */
  gone: number;
}

export interface Journey {
  days: DayISO[];
  /** Every offer with a journey, biggest absolute move first. */
  paths: JourneyPath[];
  /** Moved less than the noise floor — drawn as one faint cloud. */
  flat: JourneyPath[];
  /** The biggest movers, drawn individually so they can be read and hovered. */
  spotlight: JourneyPath[];
  /** The rest of the movers, drawn as two bundled paths (one per direction). */
  bulk: JourneyPath[];
  /** The handful that get a direct label at the right-hand edge. */
  labelled: JourneyPath[];
  dayStats: JourneyDay[];
  /** Largest |change| anywhere in the data — sets the symmetric y domain. */
  maxAbsPct: number;
  counts: JourneyCounts;
}

export interface JourneyOptions {
  /** Below this, a move is rounding and the offer joins the quiet cloud. */
  flatPct?: number;
  /** How many movers get their own stroke. Everything else is bundled. */
  spotlightCount?: number;
  /** Direct labels: this many of the biggest drops and of the biggest rises. */
  labelDrops?: number;
  labelRises?: number;
}

export const JOURNEY_DEFAULTS: Required<JourneyOptions> = {
  flatPct: 0.5,
  // Drawn as plain SVG, so this is a DOM budget rather than an animation one;
  // see PriceJourney for the split.
  spotlightCount: 60,
  labelDrops: 3,
  labelRises: 2,
};

function toPath(series: OfferSeries, dayIndexOf: Map<DayISO, number>, flatPct: number): JourneyPath | null {
  if (series.points.length < 2) return null;

  const firstPrice = series.points[0].priceEur;
  if (!(firstPrice > 0)) return null;

  const points: JourneyPoint[] = series.points.map((point) => ({
    day: point.day,
    dayIndex: dayIndexOf.get(point.day) ?? 0,
    priceEur: point.priceEur,
    pct: ((point.priceEur - firstPrice) / firstPrice) * 100,
    deltaEur: point.priceEur - firstPrice,
  }));

  const last = points[points.length - 1];
  const swingPct = points.reduce((max, p) => Math.max(max, Math.abs(p.pct)), 0);

  return {
    key: series.key,
    source: series.source,
    resort: series.resort,
    country: series.country,
    departure: series.departure,
    nights: series.nights,
    points,
    firstDay: points[0].day,
    firstPrice,
    lastDay: last.day,
    lastPrice: last.priceEur,
    netEur: last.deltaEur,
    netPct: last.pct,
    swingPct,
    direction: swingPct < flatPct ? "flat" : last.pct < 0 ? "drop" : "rise",
    active: series.active,
    gone: !series.active,
  };
}

/**
 * Folds a SeriesIndex into everything the chart draws.
 *
 * The percentile band deliberately excludes an offer on the night it first
 * appears: a new arrival is 0% by construction, and counting those zeros would
 * pull the band towards "nothing changed" exactly when the market is churning
 * most. The first night is therefore a pinch point at zero, which is honest —
 * on the first night nothing had happened yet.
 */
export function buildJourney(index: SeriesIndex, options: JourneyOptions = {}): Journey {
  const { flatPct, spotlightCount, labelDrops, labelRises } = { ...JOURNEY_DEFAULTS, ...options };
  const days = index.days;
  const dayIndexOf = new Map(days.map((day, i) => [day, i]));

  const paths: JourneyPath[] = [];
  let joinedToday = 0;

  for (const series of index.byKey.values()) {
    if (series.points.length < 2) {
      if (series.isNew) joinedToday += 1;
      continue;
    }
    const path = toPath(series, dayIndexOf, flatPct);
    if (path) paths.push(path);
  }

  paths.sort((a, b) => Math.abs(b.netPct) - Math.abs(a.netPct));

  // Changes per night, keyed by day, for the percentile band.
  const changesByDay = new Map<DayISO, number[]>(days.map((day) => [day, []]));
  for (const path of paths) {
    for (const point of path.points) {
      if (point.day === path.firstDay) continue; // see the note above
      changesByDay.get(point.day)?.push(point.pct);
    }
  }

  const dayStats: JourneyDay[] = days.map((day, dayIndex) => {
    const values = (changesByDay.get(day) ?? []).slice().sort((a, b) => a - b);
    const at = (q: number) => (values.length > 0 ? (quantile(values, q) ?? 0) : 0);
    return {
      day,
      dayIndex,
      n: values.length,
      p10: at(0.1),
      p25: at(0.25),
      median: at(0.5),
      p75: at(0.75),
      p90: at(0.9),
    };
  });

  const movers = paths.filter((p) => p.direction !== "flat");
  const flat = paths.filter((p) => p.direction === "flat");
  const spotlight = movers.slice(0, spotlightCount);
  const bulk = movers.slice(spotlightCount);

  // Labels go to the biggest *net* move in each direction, among offers still
  // on sale — a label pointing at a package nobody can buy is a dead end.
  const labelled = [
    ...movers.filter((p) => p.direction === "drop" && p.active).slice(0, labelDrops),
    ...movers.filter((p) => p.direction === "rise" && p.active).slice(0, labelRises),
  ];

  const maxAbsPct = paths.reduce((max, p) => Math.max(max, p.swingPct), 0);

  return {
    days,
    paths,
    flat,
    spotlight,
    bulk,
    labelled,
    dayStats,
    maxAbsPct,
    counts: {
      tracked: paths.length,
      moved: movers.length,
      cheaper: movers.filter((p) => p.direction === "drop").length,
      pricier: movers.filter((p) => p.direction === "rise").length,
      unchanged: flat.length,
      joinedToday,
      gone: paths.filter((p) => p.gone).length,
    },
  };
}

/**
 * A short string that changes whenever the drawn journey changes.
 *
 * The left-to-right reveal is driven by remounting one clip rectangle, and
 * framer's `initial` only runs on mount — so the reveal needs a key that moves
 * when the data does, not just on first paint.
 */
export function journeySignature(journey: Journey): string {
  const { counts, days } = journey;
  return [
    days.length,
    days[days.length - 1] ?? "none",
    counts.tracked,
    counts.cheaper,
    counts.pricier,
    counts.unchanged,
  ].join(":");
}

/**
 * Path data for a set of journeys as one `d` string, each offer contributing an
 * independent subpath (M … L …).
 *
 * Hundreds of separate <path> elements cost more than the picture is worth when
 * the picture is a texture rather than a set of readable lines, so the quiet
 * cloud and the bundled movers each collapse into a single element. Straight
 * segments only: a curve between two nightly checks would draw prices at hours
 * nobody looked.
 */
export function bundleD(
  paths: JourneyPath[],
  x: (dayIndex: number) => number,
  y: (pct: number) => number
): string {
  let d = "";
  for (const path of paths) {
    path.points.forEach((point, i) => {
      d += `${i === 0 ? "M" : "L"}${x(point.dayIndex).toFixed(1)},${y(point.pct).toFixed(1)}`;
    });
  }
  return d;
}

/** The same thing for one offer, so a hovered path can be redrawn on top. */
export function singleD(
  path: JourneyPath,
  x: (dayIndex: number) => number,
  y: (pct: number) => number
): string {
  return bundleD([path], x, y);
}
