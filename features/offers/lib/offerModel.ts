import type { OfferStatus, PriceRow, PropertyType, SourceOfferHistory, SourceOffers } from "@/features/prices/lib/priceTypes";
import { getBrand } from "@/features/brands/constants";
import { buildHomeModel } from "@/features/analytics/lib/homeModel";
import { countryBadge } from "@/features/offers/lib/countryBadge";
import { hotelLabelOf, hotelLabels, propertyTypeOf } from "@/features/offers/lib/hotelLabels";
import { paxOf, totalPrice, type PartyChoice } from "@/features/offers/lib/pricing";
import { matchesQuery } from "@/features/offers/lib/offerSearch";
import { flightStatus, type FlightStatus, type StatedInclusions } from "@/features/offers/inclusions/lib/packageInclusions";
import { boardFor, type BoardBasis } from "@/features/offers/inclusions/lib/board";
import { DEFAULT_FILTERS, FILTERS_COUNTED_AS_ACTIVE } from "@/features/offers/constants";

export interface Offer {
  key: string;
  source: string;
  brandName: string;
  resortId: string;
  resort: string;
  resortKey: string;
  hotel?: string;
  hotelKey: string;
  propertyType: PropertyType;
  country: string;
  countryCode: string;
  countryName: string;
  flag: string;
  departure: string;
  nights?: number;
  pax: number;
  total: number;
  perPerson: number;
  pct: number | null;
  delta: number | null;
  isNew: boolean;
  status: OfferStatus;
  url?: string;
  flights: FlightStatus;
  board: BoardBasis;
  boardRaw?: string;
  stated: StatedInclusions;
}

const changeKey = (source: string, row: PriceRow): string => {
  return [source, row.resortId, row.hotel ?? "", row.date, row.nights ?? "?"].join("|");
};

export const buildOffers = (latest: SourceOffers[] | undefined, history: SourceOfferHistory[] | undefined): Offer[] => {
  if (!latest) return [];

  const everyRow = latest.flatMap((entry) => entry.data);
  const labels = hotelLabels(everyRow);

  const moves = new Map<string, { pct: number | null; delta: number | null; isNew: boolean }>();
  if (history) {
    for (const offer of buildHomeModel(history).offers) {
      moves.set(offer.key, { pct: offer.pct, delta: offer.delta, isNew: offer.isNew });
    }
  }

  const offers: Offer[] = [];
  for (const entry of latest) {
    const brand = getBrand(entry.source);
    for (const row of entry.data) {
      const badge = countryBadge(row.country);
      const hotel = hotelLabelOf(row, labels);
      const pax = paxOf(row);
      const total = totalPrice(row);
      const move = moves.get(changeKey(entry.source, row));
      offers.push({
        key: `${entry.source}|${row.resortId}|${row.hotel ?? ""}|${row.date}|${row.nights ?? "?"}|${row.priceEur}`,
        source: entry.source,
        brandName: brand?.name ?? entry.source,
        resortId: row.resortId,
        resort: row.resort,
        resortKey: row.resortKey ?? row.resort,
        hotel,
        hotelKey: row.hotelKey ?? hotel ?? "",
        propertyType: propertyTypeOf(row),
        country: row.country,
        countryCode: badge.code,
        countryName: badge.name,
        flag: badge.flag,
        departure: row.date,
        nights: row.nights ?? brand?.defaultNights,
        pax,
        total,
        perPerson: Math.round(total / Math.max(pax, 1)),
        pct: move?.pct ?? null,
        delta: move?.delta ?? null,
        isNew: move?.isNew ?? false,
        status: row.status,
        url: row.url,
        flights: flightStatus(entry.source, row.flights),
        board: boardFor(entry.source, row.board),
        boardRaw: row.board,
        stated: {
          ...(row.flights !== undefined ? { flights: row.flights } : {}),
          ...(row.transfers !== undefined ? { transfers: row.transfers } : {}),
          ...(row.departsFrom ? { departsFrom: row.departsFrom } : {}),
          ...(row.airline ? { airline: row.airline } : {}),
          ...(row.baggageKg !== undefined ? { baggageKg: row.baggageKg } : {}),
          ...(row.cabinKg !== undefined ? { cabinKg: row.cabinKg } : {}),
          ...(row.liftPassDays !== undefined ? { liftPassDays: row.liftPassDays } : {}),
          ...(row.liftPass !== undefined ? { liftPass: row.liftPass } : {}),
        },
      });
    }
  }
  return offers;
};

export type OfferSort = "cheapest" | "dearest" | "drop" | "soonest";

export interface OfferFilters {
  query: string;
  resorts: string[] | null;
  hotels: string[] | null;
  countries: string[] | null;
  brands: string[] | null;
  types: PropertyType[];
  party: PartyChoice;
  nights: number[] | null;
  from: string | null;
  to: string | null;
  maxTotal: number | null;
  maxPerPerson: number | null;
  change: "any" | "down" | "up";
  status: "any" | "new";
  flights: FlightStatus[] | null;
  board: BoardBasis[] | null;
  sort: OfferSort;
}

const isActive = (filters: OfferFilters, field: keyof OfferFilters): boolean => {
  if (field === "types") {
    const types = filters.types;
    return types.length !== DEFAULT_FILTERS.types.length
      || !DEFAULT_FILTERS.types.every((t) => types.includes(t));
  }
  return JSON.stringify(filters[field]) !== JSON.stringify(DEFAULT_FILTERS[field]);
};

export const activeFilterCount = (filters: OfferFilters): number => {
  return FILTERS_COUNTED_AS_ACTIVE.filter((field) => isActive(filters, field)).length;
};

export const shortDeparture = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const stayRange = (iso: string, nights: number | undefined): string => {
  const start = shortDeparture(iso);
  if (!nights) return start;
  const departure = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(departure)) return start;
  const end = new Date(departure + nights * 86_400_000).toISOString().slice(0, 10);
  return `${start} → ${shortDeparture(end)}`;
};

export const filterOffers = (offers: Offer[], filters: OfferFilters): Offer[] => {
  const kept = offers.filter((offer) => {
    if (filters.types.length > 0 && !filters.types.includes(offer.propertyType)) return false;
    if (filters.resorts && !filters.resorts.includes(offer.resortKey)) return false;
    if (filters.hotels && !filters.hotels.includes(offer.hotelKey)) return false;
    if (filters.countries && !filters.countries.includes(offer.countryCode)) return false;
    if (filters.brands && !filters.brands.includes(offer.source)) return false;
    if (filters.party !== "any" && offer.pax !== filters.party) return false;
    if (filters.nights && (offer.nights === undefined || !filters.nights.includes(offer.nights))) return false;
    if (filters.from && offer.departure < filters.from) return false;
    if (filters.to && offer.departure > filters.to) return false;
    if (filters.maxTotal !== null && offer.total > filters.maxTotal) return false;
    if (filters.maxPerPerson !== null && offer.perPerson > filters.maxPerPerson) return false;
    if (filters.change === "down" && !(offer.pct !== null && offer.pct < 0)) return false;
    if (filters.change === "up" && !(offer.pct !== null && offer.pct > 0)) return false;
    if (filters.status === "new" && !offer.isNew) return false;
    if (filters.flights && !filters.flights.includes(offer.flights)) return false;
    if (filters.board && !filters.board.includes(offer.board)) return false;
    if (filters.query && !matchesQuery(filters.query, offer.resort, offer.hotel, offer.brandName, offer.countryName))
      return false;
    return true;
  });

  return sortOffers(kept, filters.sort);
};

export const sortOffers = (offers: Offer[], sort: OfferSort): Offer[] => {
  const sorted = [...offers];
  switch (sort) {
    case "dearest":
      return sorted.sort((a, b) => b.total - a.total);
    case "drop":
      return sorted.sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
    case "soonest":
      return sorted.sort((a, b) => a.departure.localeCompare(b.departure));
    default:
      return sorted.sort((a, b) => a.total - b.total);
  }
};

export interface PickerOption {
  value: string;
  label: string;
  meta: string;
  count: number;
}

export const countBy = (offers: Offer[], value: (offer: Offer) => string | undefined, label: (offer: Offer) => string): PickerOption[] => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const offer of offers) {
    const key = value(offer);
    if (!key) continue;
    const entry = counts.get(key) ?? { label: label(offer), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.entries()]
    .map(([value, entry]) => ({ value, label: entry.label, meta: "", count: entry.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};
