/**
 * Mirrors Backend/src/sources/source.types.ts and the objects returned by
 * GET /prices/fetch-latest-offers and GET /prices/fetch-all-offers.
 * Kept in sync by hand since the two projects aren't a shared monorepo.
 */

/** Hotels and clubs are catered; apartments and chalets are self-catering. */
export type PropertyType = "hotel" | "club" | "apartment" | "chalet";

/** How urgently Club Med (and future sources) flag one priced departure date. */
export type OfferStatus = "green" | "orange" | "default";

/** One price for one resort on one departure date. Every source returns this shape. */
export interface PriceRow {
  resortId: string;
  /** The ski resort, canonical and in English — "Bansko", not "Bansko · Rila". */
  resort: string;
  /** Canonical resort slug, shared across operators. Absent on rows collected
   *  before the catalogue existed and never matched to a known resort. */
  resortKey?: string;
  /** The property sold at that resort: a hotel, chalet or club. */
  hotel?: string;
  /** Shared identity for the property across operators, `<resortKey>|<slug>`.
   *  Ophir's "VIHREN PALACE" and Issta's "Vihren Palace Ski & Spa Resort"
   *  carry the same key, so they filter and group as one hotel. */
  hotelKey?: string;
  /** What kind of place it is. The table shows hotels and clubs by default. */
  propertyType?: PropertyType;
  /** Board basis, where the operator states one. */
  board?: string;
  country: string;
  /** Departure date, YYYY-MM-DD */
  date: string;
  /**
   * Length of stay. Optional because snapshots collected before this field
   * existed don't carry it — render those with the per-source fallback in
   * lib/brands/config.ts rather than guessing a number here.
   */
  nights?: number;
  /** Price per person, in EUR — the same unit for every operator. */
  priceEur: number;
  /** How many people that per-person price assumes sharing; two unless the
   *  operator says otherwise. Multiply to get the booking's total. */
  pax?: number;
  /** IATA code the package flies from, when the operator states it per offer.
   *  Absent means "not stated", never "no flight" — see lib/offers/inclusions. */
  departsFrom?: string;
  /** Airport transfers, where the offer itself says so. Absent means the
   *  operator did not state it on this offer, not that there are none. */
  transfers?: boolean;
  /** Whether a flight is in the package, where the offer itself says so.
   *  Absent means "not stated" — never "no flight". */
  flights?: boolean;
  /** Carrier on the outbound leg, where the offer names one. */
  airline?: string;
  /** Hold baggage per person in kg, as the fare states it. */
  baggageKg?: number;
  /** Cabin trolley per person in kg. */
  cabinKg?: number;
  /** Days of lift pass bundled into the package, where it says so. */
  liftPassDays?: number;
  /** A lift pass is in the package, where the offer says so without naming
   *  a number of days. */
  liftPass?: boolean;
  status: OfferStatus;
  /** Deep link to this offer on the operator's own site, when one exists. */
  url?: string;
}

/** Response shape of GET /prices/fetch-latest-offers, one entry per source. */
export interface SourceOffers {
  source: string;
  /** DD-MM-YYYY, or null if that source hasn't collected anything yet. */
  day: string | null;
  data: PriceRow[];
}

/** Response shape of GET /prices/fetch-all-offers, one entry per source. */
export interface SourceOfferHistory {
  source: string;
  days: { day: string; data: PriceRow[] }[];
}
