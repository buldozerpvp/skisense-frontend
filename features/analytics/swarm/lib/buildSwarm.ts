import { getBrand } from "@/features/brands/constants";
import { buildSeriesIndex, toIsoDay } from "@/features/analytics/lib/deriveSeries";
import { dateValue } from "@/shared/format/formatters";
import type { DayISO, OfferKey } from "@/features/analytics/lib/types";
import type { SourceOfferHistory } from "@/features/prices/lib/priceTypes";
import {
  MIN_IDENTITY_OVERLAP,
  MOVE_NOISE_PCT,
  MOVE_SCALE_PERCENTILE,
  SWARM_MIN_FRAMES,
} from "@/features/analytics/swarm/constants";

export interface SwarmDot {
  key: OfferKey;
  source: string;
  departureValue: number;
  perNight: number;
  movePct: number;
}

export interface SwarmFrame {
  day: DayISO;
  dots: SwarmDot[];
  cheaper: number;
  dearer: number;
  medianPerNight: number | null;
}

export interface SwarmModel {
  frames: SwarmFrame[];
  departureSpan: [number, number];
  perNightSpan: [number, number];
  moveBoundPct: number;
}

const EMPTY: SwarmModel = {
  frames: [],
  departureSpan: [0, 1],
  perNightSpan: [1, 2],
  moveBoundPct: 1,
};

interface Track {
  key: OfferKey;
  source: string;
  departureValue: number;
  nights: number;
  prices: Map<DayISO, number>;
}

const collectedDaysBySource = (history: SourceOfferHistory[]): Map<string, DayISO[]> => {
  const collected = new Map<string, DayISO[]>();
  for (const source of history) {
    collected.set(
      source.source,
      source.days
        .filter((snapshot) => snapshot.data.length > 0)
        .map((snapshot) => toIsoDay(snapshot.day))
        .sort()
    );
  }
  return collected;
};

const lastCollectionOnOrBefore = (collected: DayISO[] | undefined, day: DayISO): DayISO | null => {
  if (!collected) return null;
  let answer: DayISO | null = null;
  for (const candidate of collected) {
    if (candidate > day) break;
    answer = candidate;
  }
  return answer;
};

const listedDayPerSource = (
  collected: Map<string, DayISO[]>,
  day: DayISO
): Map<string, DayISO | null> => {
  const listed = new Map<string, DayISO | null>();
  for (const [source, days] of collected) listed.set(source, lastCollectionOnOrBefore(days, day));
  return listed;
};

const priceOn = (track: Track, listed: Map<string, DayISO | null>): number | undefined => {
  const asOf = listed.get(track.source);
  if (!asOf) return undefined;
  const price = track.prices.get(asOf);
  return price !== undefined && price > 0 ? price : undefined;
};

const sharedFraction = (earlier: Set<OfferKey>, later: Set<OfferKey>): number => {
  if (later.size === 0) return 0;
  let shared = 0;
  for (const key of later) if (earlier.has(key)) shared += 1;
  return shared / later.size;
};

const comparableRunStart = (keysPerDay: Set<OfferKey>[]): number => {
  let start = keysPerDay.length - 1;
  while (start > 0 && sharedFraction(keysPerDay[start - 1], keysPerDay[start]) >= MIN_IDENTITY_OVERLAP) {
    start -= 1;
  }
  return start;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
};

const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
};

export const buildSwarm = (history: SourceOfferHistory[] | undefined): SwarmModel => {
  if (!history || history.length === 0) return EMPTY;

  const index = buildSeriesIndex(history);
  if (index.days.length < SWARM_MIN_FRAMES) return EMPTY;

  const collected = collectedDaysBySource(history);
  const tracks: Track[] = [];

  for (const series of index.byKey.values()) {
    const nights = series.nights ?? getBrand(series.source)?.defaultNights;
    if (!nights || series.points.length === 0) continue;
    tracks.push({
      key: series.key,
      source: series.source,
      departureValue: dateValue(series.departure),
      nights,
      prices: new Map(series.points.map((point) => [point.day, point.priceEur])),
    });
  }

  if (tracks.length === 0) return EMPTY;

  const listedPerDay = index.days.map((day) => listedDayPerSource(collected, day));
  const keysPerDay = listedPerDay.map((listed) => {
    const keys = new Set<OfferKey>();
    for (const track of tracks) if (priceOn(track, listed) !== undefined) keys.add(track.key);
    return keys;
  });

  const start = comparableRunStart(keysPerDay);
  const days = index.days.slice(start);
  if (days.length < SWARM_MIN_FRAMES) return EMPTY;

  const baselines = new Map<OfferKey, number>();
  const frames: SwarmFrame[] = [];
  const moves: number[] = [];
  let minDeparture = Infinity;
  let maxDeparture = -Infinity;
  let minPerNight = Infinity;
  let maxPerNight = -Infinity;

  for (let i = 0; i < days.length; i += 1) {
    const listed = listedPerDay[start + i];
    const dots: SwarmDot[] = [];
    const perNights: number[] = [];
    let cheaper = 0;
    let dearer = 0;

    for (const track of tracks) {
      const price = priceOn(track, listed);
      if (price === undefined) continue;

      let baseline = baselines.get(track.key);
      if (baseline === undefined) {
        baseline = price;
        baselines.set(track.key, baseline);
      }

      const perNight = price / track.nights;
      const movePct = ((price - baseline) / baseline) * 100;

      dots.push({ key: track.key, source: track.source, departureValue: track.departureValue, perNight, movePct });
      perNights.push(perNight);
      if (movePct < 0) cheaper += 1;
      if (movePct > 0) dearer += 1;
      if (Math.abs(movePct) >= MOVE_NOISE_PCT) moves.push(Math.abs(movePct));

      if (track.departureValue < minDeparture) minDeparture = track.departureValue;
      if (track.departureValue > maxDeparture) maxDeparture = track.departureValue;
      if (perNight < minPerNight) minPerNight = perNight;
      if (perNight > maxPerNight) maxPerNight = perNight;
    }

    frames.push({ day: days[i], dots, cheaper, dearer, medianPerNight: median(perNights) });
  }

  const populated = frames.filter((frame) => frame.dots.length > 0);
  if (populated.length < SWARM_MIN_FRAMES) return EMPTY;

  return {
    frames: populated,
    departureSpan: [minDeparture, maxDeparture],
    perNightSpan: [minPerNight, maxPerNight],
    moveBoundPct: Math.max(percentile(moves, MOVE_SCALE_PERCENTILE), MOVE_NOISE_PCT * 2),
  };
};
