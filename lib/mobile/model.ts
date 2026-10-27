import type { OfferStatus, PriceRow, PropertyType, SourceOfferHistory, SourceOffers } from "@/lib/brands/types";
import { getBrand } from "@/lib/brands/config";
import { buildHomeModel } from "@/lib/analytics/home";
import { countryBadge } from "@/lib/table/countries";
import { hotelLabelOf, hotelLabels, propertyTypeOf } from "@/lib/table/hotels";
import { paxOf, totalPrice, type PartyChoice } from "@/lib/table/pricing";
import { matchesQuery } from "@/lib/table/search";
import { flightStatus, type FlightStatus, type StatedInclusions } from "@/lib/offers/inclusions";
import { boardFor, type BoardBasis } from "@/lib/offers/board";

/**
 * One offer, flattened for a phone.
 *
 * The table builds its cells from the raw row and its column definitions; a
 * phone row has no columns, so everything it can show — the label, the badge,
 * the two prices, the overnight move — is resolved once here and the list
 * components just read fields.
 */
export interface MobileOffer {
  key: string;
  source: string;
  brandName: string;
  /** The operator's own id for the resort, which keys the history series. */
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
  /** Change against this offer's own previous observation, not against yesterday. */
  pct: number | null;
  delta: number | null;
  isNew: boolean;
  status: OfferStatus;
  url?: string;
  /** Whether this operator's price carries a flight. See lib/offers/inclusions. */
  flights: FlightStatus;
  /** Which meals are in the price, normalised across operators. */
  board: BoardBasis;
  /** The operator's own words for the board, kept for the offer sheet. */
  boardRaw?: string;
  /** What this offer's own page said about flights, transfers and lift pass,
   *  where it said anything. The sheet shows the detail; the filter above
   *  only needs the three-state answer. */
  stated: StatedInclusions;
}

/** Identity used by the home model, rebuilt here so changes can be looked up. */
function changeKey(source: string, row: PriceRow): string {
  return [source, row.resortId, row.hotel ?? "", row.date, row.nights ?? "?"].join("|");
}

/**
 * Flattens the latest snapshot into phone rows, attaching each offer's
 * overnight move from the history when that query has resolved.
 *
 * History is optional on purpose: the list renders as soon as the latest
 * prices arrive, and the move badges fill in afterwards rather than holding
 * the whole screen behind the bigger request.
 */
export function buildMobileOffers(
  latest: SourceOffers[] | undefined,
  history: SourceOfferHistory[] | undefined
): MobileOffer[] {
  if (!latest) return [];

  const everyRow = latest.flatMap((entry) => entry.data);
  const labels = hotelLabels(everyRow);

  const moves = new Map<string, { pct: number | null; delta: number | null; isNew: boolean }>();
  if (history) {
    for (const offer of buildHomeModel(history).offers) {
      moves.set(offer.key, { pct: offer.pct, delta: offer.delta, isNew: offer.isNew });
    }
  }

  const offers: MobileOffer[] = [];
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
        // What the offer's own page stated, where it did. Passed through
        // rather than folded in here: the sheet shows the detail, the filter
        // only needs the three-state answer above.
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
}

/** How the list can be ordered. Cheapest first is the opening view. */
export type MobileSort = "cheapest" | "dearest" | "drop" | "soonest";

export const SORT_LABEL: Record<MobileSort, string> = {
  cheapest: "Cheapest",
  dearest: "Most expensive",
  drop: "Biggest drop",
  soonest: "Soonest",
};

/**
 * Everything the phone can narrow by — one entry per column the desktop table
 * has. `null` on a multi-select means no filter at all, the same three-state
 * convention the desktop MultiSelectFilter uses, so "all" and "none selected"
 * stay different things.
 */
export interface MobileFilters {
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
  /** Which package kinds to show. Defaults to flight-inclusive ones. */
  flights: FlightStatus[] | null;
  /** Which board bases to show. Null is all of them. */
  board: BoardBasis[] | null;
  sort: MobileSort;
}

/** Catered places only, matching the table's opening view. */
export const DEFAULT_FILTERS: MobileFilters = {
  query: "",
  resorts: null,
  hotels: null,
  countries: null,
  brands: null,
  types: ["hotel", "club"],
  party: "any",
  nights: null,
  from: null,
  to: null,
  maxTotal: null,
  maxPerPerson: null,
  change: "any",
  status: "any",
  // Most people here are flying from Tel Aviv, so the opening view is the
  // packages that include the flight. It is a filter, not a hiding place:
  // the chip row always shows it and one tap widens to everything.
  flights: ["included"],
  board: null,
  sort: "cheapest",
};

/** Whether a filter differs from its default, so the badge can count it. */
function isActive(filters: MobileFilters, field: keyof MobileFilters): boolean {
  if (field === "types") {
    const types = filters.types;
    return types.length !== DEFAULT_FILTERS.types.length
      || !DEFAULT_FILTERS.types.every((t) => types.includes(t));
  }
  return JSON.stringify(filters[field]) !== JSON.stringify(DEFAULT_FILTERS[field]);
}

/** Fields the chip row and the badge count. Query and sort are shown separately. */
const COUNTED: (keyof MobileFilters)[] = [
  "resorts", "hotels", "countries", "brands", "types",
  "party", "nights", "from", "to", "maxTotal", "maxPerPerson", "change", "status", "flights", "board",
];

export function activeFilterCount(filters: MobileFilters): number {
  return COUNTED.filter((field) => isActive(filters, field)).length;
}

/** The month and day a departure reads as, without the year. */
export function shortDeparture(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Applies the whole filter set, then orders the result.
 *
 * Search runs last of the cheap checks and over the resolved display fields,
 * so typing "magic pas" reaches a row whose operator spelled it
 * "Hôtel Màgic Pas" — the fold happens in matchesQuery.
 */
export function filterMobileOffers(offers: MobileOffer[], filters: MobileFilters): MobileOffer[] {
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

  return sortMobileOffers(kept, filters.sort);
}

export function sortMobileOffers(offers: MobileOffer[], sort: MobileSort): MobileOffer[] {
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
}

/** Distinct values for a picker, each with how many offers carry it. */
export interface PickerOption {
  value: string;
  label: string;
  meta: string;
  count: number;
}

export function countBy(
  offers: MobileOffer[],
  value: (offer: MobileOffer) => string | undefined,
  label: (offer: MobileOffer) => string
): PickerOption[] {
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
}
