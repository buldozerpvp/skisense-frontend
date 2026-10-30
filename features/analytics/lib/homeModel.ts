import { getBrand } from "@/features/brands/constants";
import { paxOf, totalPrice } from "@/features/offers/lib/pricing";
import { toIsoDay } from "@/features/analytics/lib/deriveSeries";
import type { DayISO } from "@/features/analytics/lib/types";
import type { OfferStatus, PriceRow, SourceOfferHistory } from "@/features/prices/lib/priceTypes";

export const NOISE_FLOOR = { minAbsEur: 50, minPct: 2 } as const;

export interface HomeOffer {
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
  total: number;
  perNight: number;
  status: OfferStatus;
  firstDay: DayISO;
  lastDay: DayISO;
  prevTotal: number | null;
  delta: number | null;
  pct: number | null;
  active: boolean;
  isNew: boolean;
}

export interface HomeSummary {
  cheaper: number;
  dearer: number;
  rechecked: number;
  lastCheck: DayISO | null;
}

export interface HomeModel {
  days: DayISO[];
  offers: HomeOffer[];
  movers: HomeOffer[];
  summary: HomeSummary;
}

const homeKey = (source: string, row: PriceRow): string => {
  return [source, row.resortId, row.hotel ?? "", row.date, row.nights ?? "?"].join("|");
};

const nightsFor = (source: string, row: PriceRow): number | undefined => {
  return row.nights ?? getBrand(source)?.defaultNights;
};

interface Observation {
  day: DayISO;
  total: number;
  row: PriceRow;
}

export const buildHomeModel = (history: SourceOfferHistory[] | undefined, upTo?: DayISO | null): HomeModel => {
  const daySet = new Set<DayISO>();
  const series = new Map<string, { source: string; observations: Observation[] }>();
  const lastDayBySource = new Map<string, DayISO>();

  for (const source of history ?? []) {
    for (const snapshot of source.days) {
      const day = toIsoDay(snapshot.day);
      if (upTo && day > upTo) continue;
      daySet.add(day);

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
};

export const topMoves = (movers: HomeOffer[], perSide = 6): HomeOffer[] => {
  const drops = pickDiverse(movers.filter((m) => (m.delta as number) < 0), perSide);
  const rises = pickDiverse(movers.filter((m) => (m.delta as number) > 0), perSide);
  return [...drops, ...rises].sort((a, b) => (a.pct as number) - (b.pct as number));
};

const pickDiverse = (movers: HomeOffer[], limit: number, perResort = 2): HomeOffer[] => {
  const picked: HomeOffer[] = [];
  const seen = new Map<string, number>();
  for (const mover of movers) {
    if (picked.length >= limit) break;
    const count = seen.get(mover.resort) ?? 0;
    if (count >= perResort) continue;
    seen.set(mover.resort, count + 1);
    picked.push(mover);
  }
  if (picked.length < limit) {
    for (const mover of movers) {
      if (picked.length >= limit) break;
      if (!picked.includes(mover)) picked.push(mover);
    }
  }
  return picked;
};

export interface ResortLevel {
  resort: string;
  country: string;
  n: number;
  cheapest: HomeOffer;
  cheapestPerNight: number;
  typicalPerNight: number;
}

export const resortLevels = (offers: HomeOffer[], limit = 12): ResortLevel[] => {
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
};

export interface SeasonWeek {
  weekStart: DayISO;
  n: number;
  cheapestPerNight: number;
  budgetPerNight: number;
  typicalPerNight: number;
  cheapest: HomeOffer;
}

export const seasonWeeks = (offers: HomeOffer[], minPerWeek = 2): SeasonWeek[] => {
  const byWeek = new Map<DayISO, HomeOffer[]>();
  for (const offer of offers) {
    const week = weekStartOf(offer.departure);
    const bucket = byWeek.get(week);
    if (bucket) bucket.push(offer);
    else byWeek.set(week, [offer]);
  }

  return [...byWeek.entries()]
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
};

const weekStartOf = (day: DayISO): DayISO => {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; 
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
};

const medianOf = (sorted: number[]): number => {
  return quantileOf(sorted, 0.5);
};

const quantileOf = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
