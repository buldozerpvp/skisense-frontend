import { getBrand } from "@/features/brands/constants";
import { buildSeriesIndex, toIsoDay } from "@/features/analytics/lib/deriveSeries";
import type { DayISO, OfferKey } from "@/features/analytics/lib/types";
import type { SourceOfferHistory } from "@/features/prices/lib/priceTypes";
import {
  CALENDAR_ROWS,
  MIN_IDENTITY_OVERLAP,
  MOVE_NOISE_PCT,
  PRICE_HIGH_PERCENTILE,
  PRICE_LOW_PERCENTILE,
  SKI_WEEK_NIGHTS,
  WEEK_CALENDAR_MIN_FRAMES,
} from "@/features/analytics/week-calendar/constants";

export type WeekStart = string;

export interface CalendarFrame {
  day: DayISO;
  best: Map<string, number>;
  weeksOnSale: number;
  cheaper: number;
  dearer: number;
}

export interface WeekCalendarModel {
  frames: CalendarFrame[];
  resorts: string[];
  weeks: WeekStart[];
  low: number;
  mid: number;
  high: number;
}

export const cellKey = (resort: string, week: WeekStart): string => `${resort}\u0000${week}`;

const EMPTY: WeekCalendarModel = { frames: [], resorts: [], weeks: [], low: 1, mid: 2, high: 3 };

const DAY_MS = 86_400_000;

const mondayOf = (departure: DayISO): WeekStart => {
  const at = new Date(`${departure}T00:00:00Z`);
  const weekday = (at.getUTCDay() + 6) % 7;
  return new Date(at.getTime() - weekday * DAY_MS).toISOString().slice(0, 10);
};

const percentile = (sorted: number[], fraction: number): number => {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
};

interface Week {
  key: OfferKey;
  source: string;
  resort: string;
  week: WeekStart;
  total: Map<DayISO, number>;
  baseline: number;
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

const listedDayPerSource = (collected: Map<string, DayISO[]>, day: DayISO): Map<string, DayISO | null> => {
  const listed = new Map<string, DayISO | null>();
  for (const [source, days] of collected) {
    let answer: DayISO | null = null;
    for (const candidate of days) {
      if (candidate > day) break;
      answer = candidate;
    }
    listed.set(source, answer);
  }
  return listed;
};

const partySizeByKey = (history: SourceOfferHistory[]): Map<OfferKey, number> => {
  const party = new Map<OfferKey, number>();
  for (const source of history) {
    for (const snapshot of source.days) {
      for (const row of snapshot.data) {
        party.set(`${source.source}|${row.resortId}|${row.date}|${row.nights ?? "?"}`, row.pax ?? 2);
      }
    }
  }
  return party;
};

export const buildWeekCalendar = (history: SourceOfferHistory[] | undefined): WeekCalendarModel => {
  if (!history || history.length === 0) return EMPTY;

  const index = buildSeriesIndex(history);
  if (index.days.length < WEEK_CALENDAR_MIN_FRAMES) return EMPTY;

  const collected = collectedDaysBySource(history);
  const party = partySizeByKey(history);
  const stays: Week[] = [];

  for (const series of index.byKey.values()) {
    const nights = series.nights ?? getBrand(series.source)?.defaultNights;
    if (!nights || !SKI_WEEK_NIGHTS.includes(nights)) continue;
    const pax = party.get(series.key) ?? 2;
    const baseline = (series.points[0]?.priceEur ?? 0) * pax;
    if (baseline <= 0) continue;
    stays.push({
      key: series.key,
      source: series.source,
      resort: series.resort,
      week: mondayOf(series.departure),
      total: new Map(series.points.map((point) => [point.day, point.priceEur * pax])),
      baseline,
    });
  }

  if (stays.length === 0) return EMPTY;

  const listedPerDay = index.days.map((day) => listedDayPerSource(collected, day));
  const priceOn = (stay: Week, listed: Map<string, DayISO | null>): number | undefined => {
    const asOf = listed.get(stay.source);
    if (!asOf) return undefined;
    const price = stay.total.get(asOf);
    return price !== undefined && price > 0 ? price : undefined;
  };

  const keysPerDay = listedPerDay.map((listed) => {
    const keys = new Set<OfferKey>();
    for (const stay of stays) if (priceOn(stay, listed) !== undefined) keys.add(stay.key);
    return keys;
  });

  let start = keysPerDay.length - 1;
  while (start > 0) {
    const earlier = keysPerDay[start - 1];
    const later = keysPerDay[start];
    if (later.size === 0) break;
    let shared = 0;
    for (const key of later) if (earlier.has(key)) shared += 1;
    if (shared / later.size < MIN_IDENTITY_OVERLAP) break;
    start -= 1;
  }

  const days = index.days.slice(start);
  if (days.length < WEEK_CALENDAR_MIN_FRAMES) return EMPTY;

  const baselines = new Map<OfferKey, number>();
  const cheapestPerCell: Map<string, number>[] = [];
  const counts: { cheaper: number; dearer: number }[] = [];

  for (let i = 0; i < days.length; i += 1) {
    const listed = listedPerDay[start + i];
    const best = new Map<string, number>();
    let cheaper = 0;
    let dearer = 0;

    for (const stay of stays) {
      const price = priceOn(stay, listed);
      if (price === undefined) continue;

      let baseline = baselines.get(stay.key);
      if (baseline === undefined) {
        baseline = price;
        baselines.set(stay.key, baseline);
      }
      const movePct = ((price - baseline) / baseline) * 100;
      if (movePct <= -MOVE_NOISE_PCT) cheaper += 1;
      if (movePct >= MOVE_NOISE_PCT) dearer += 1;

      const cell = cellKey(stay.resort, stay.week);
      const current = best.get(cell);
      if (current === undefined || price < current) best.set(cell, price);
    }

    cheapestPerCell.push(best);
    counts.push({ cheaper, dearer });
  }

  const latestListed = listedPerDay[listedPerDay.length - 1];
  const market = new Map<string, { onSale: number; floor: number }>();
  for (const stay of stays) {
    const price = priceOn(stay, latestListed);
    if (price === undefined) continue;
    const entry = market.get(stay.resort);
    if (!entry) market.set(stay.resort, { onSale: 1, floor: price });
    else {
      entry.onSale += 1;
      if (price < entry.floor) entry.floor = price;
    }
  }

  const resorts = [...market]
    .sort((a, b) => b[1].onSale - a[1].onSale || a[1].floor - b[1].floor)
    .slice(0, CALENDAR_ROWS)
    .sort((a, b) => a[1].floor - b[1].floor)
    .map(([resort]) => resort);

  const shown = new Set(resorts);
  const weeks = [
    ...new Set(
      cheapestPerCell.flatMap((best) =>
        [...best.keys()].map((cell) => cell.split("\u0000")).filter(([resort]) => shown.has(resort)).map(([, week]) => week)
      )
    ),
  ].sort();

  if (resorts.length === 0 || weeks.length === 0) return EMPTY;

  const shownPrices = cheapestPerCell
    .flatMap((best) => [...best].filter(([cell]) => shown.has(cell.split("\u0000")[0])).map(([, price]) => price))
    .sort((a, b) => a - b);

  const frames: CalendarFrame[] = cheapestPerCell.map((best, i) => ({
    day: days[i],
    best,
    weeksOnSale: [...best.keys()].filter((cell) => shown.has(cell.split("\u0000")[0])).length,
    cheaper: counts[i].cheaper,
    dearer: counts[i].dearer,
  }));

  return {
    frames,
    resorts,
    weeks,
    low: percentile(shownPrices, PRICE_LOW_PERCENTILE),
    mid: percentile(shownPrices, 0.5),
    high: percentile(shownPrices, PRICE_HIGH_PERCENTILE),
  };
};

export const bestWeekPerResort = (frame: CalendarFrame, resorts: string[]): Map<string, WeekStart> => {
  const best = new Map<string, { week: WeekStart; price: number }>();
  for (const [cell, price] of frame.best) {
    const [resort, week] = cell.split("\u0000");
    const current = best.get(resort);
    if (current === undefined || price < current.price) best.set(resort, { week, price });
  }
  const answer = new Map<string, WeekStart>();
  for (const resort of resorts) {
    const found = best.get(resort);
    if (found) answer.set(resort, found.week);
  }
  return answer;
};

