/**
 * What a price actually buys.
 *
 * Six operators quote a number for the same week and mean different things by
 * it. Club Med Israel's figure carries a flight from Tel Aviv; Belambra's is a
 * French family driving to Tignes with their own skis. Ranking those side by
 * side without saying so makes the cheapest row a lie.
 *
 * None of this is in the collected data — no operator publishes an
 * "includesFlights" field — so it is established per operator from their own
 * pages, with the evidence recorded here. Three states, and `unknown` is a
 * real answer: a wrong "includes flights" badge is worse than an honest gap,
 * because someone books on it.
 */
export type Inclusion = "yes" | "no" | "varies";

export interface SourceInclusions {
  /** Return flight to the resort's airport, in the quoted price. */
  flights: Inclusion;
  /** Airport-to-resort transfers both ways. */
  transfers: Inclusion;
  /** Lift pass for the stay. */
  liftPass: Inclusion;
  /** Where the flight leaves from, when the operator states it. */
  departsFrom?: string;
  /** Shown on the offer. One line, plain. */
  note: string;
  /** How far the evidence goes — surfaced rather than hidden. */
  confidence: "high" | "medium" | "low";
  /** Where the answer came from, so it can be re-checked. */
  evidence: string;
}

export const SOURCE_INCLUSIONS: Record<string, SourceInclusions> = {
  issta: {
    flights: "yes",
    transfers: "yes",
    liftPass: "yes",
    departsFrom: "Tel Aviv",
    note: "Flights from Tel Aviv, transfers and a lift pass are in the price.",
    confidence: "high",
    // Their own ski FAQ: "טיסות נוחות, העברות מסודרות מהשדה למלון וחזרה,
    // סקי-פס ולינה" — flights, airport transfers both ways, ski pass and
    // accommodation. Every one of the 605 live options in their ski-options
    // feed carries DepartureCode "TLV" and PackageType 1.
    evidence: "issta.co.il/ski FAQ, and DepartureCode=TLV on every option in their own API",
  },
  clubmed: {
    flights: "yes",
    transfers: "yes",
    liftPass: "yes",
    departsFrom: "Tel Aviv",
    note: "All-inclusive: flights from Tel Aviv, transfers, 6-day lift pass, meals, drinks and lessons. Equipment hire is extra.",
    confidence: "high",
    // Proved rather than assumed: the same calendar call for Tignes returns
    // €5,660-5,836 varying by date with departureCity TLV, and a flat €4,802
    // for every date with no departure city. The difference is the flight,
    // and only a flight prices by date.
    evidence: "clubmed.co.il calendar priced with and without departureCity=TLV",
  },
  pingwin: {
    flights: "yes",
    transfers: "yes",
    liftPass: "varies",
    departsFrom: "Tel Aviv or Haifa",
    note: "Flight and transfers included. Some departures leave from Haifa, and the lift pass is not in every package.",
    confidence: "medium",
    // Each package page states inclusions after "המחיר כולל"; the flight line
    // is separate and names the airport. The Bansko MPM package sells a Haifa
    // departure and says ski services are chosen at booking.
    evidence: "pingwin.co.il package pages, 'המחיר כולל' section",
  },
  skideal: {
    flights: "yes",
    transfers: "yes",
    liftPass: "varies",
    note: "Flight and transfers included — the operator never states which airport it leaves from.",
    confidence: "medium",
    // Every product's "הרכב החבילה" list opens with a direct flight on their
    // own ski charter, then transfers, then the pass. The departure airport
    // appears nowhere on their site: the strongest wording is "טיסות
    // ישראליות". Their "Get a Room" products are flight-only, no hotel.
    evidence: "skideal.co.il 'הרכב החבילה' list on each /site/ and /hotel/ page",
  },
  "ofir-tours": {
    flights: "varies",
    transfers: "yes",
    liftPass: "varies",
    note: "Transfers included. Flights only on their full packages — this price may be land only.",
    confidence: "low",
    // Every priced listing is tagged "<nights> + <board> + העברות"; transfers
    // appear on all of them and flights on none. Their own copy says flights
    // are included "אם מדובר בחבילה מלאה" — if it is a full package.
    evidence: "ophirtours.co.il listing tags and ski FAQ wording",
  },
  belambra: {
    flights: "no",
    transfers: "no",
    liftPass: "varies",
    note: "Accommodation only — a French domestic product, no flights or transfers. Some boards add the lift pass.",
    confidence: "high",
    // Their search has no departure city at all, so the price cannot vary by
    // where you start. The lift pass rides on the board code: DPRMIND and
    // PCRMIND include it (RM = remontées mécaniques), the others do not.
    evidence: "belambra.com ski listing legend and board codes",
  },
};

/** Where an offer sits for the flights filter. */
export type FlightStatus = "included" | "land-only" | "unknown";

/**
 * What one offer states about itself.
 *
 * The table above is the operator's general habit; this is the offer's own
 * page. Ophir Tours' promotion pages name the airline, both airports, the
 * baggage in the fare and the days of lift pass, so those rows no longer have
 * to inherit a cautious "varies" from their operator. Every field is optional
 * because every one of them can be unstated, and unstated is not "no".
 */
export interface StatedInclusions {
  flights?: boolean;
  transfers?: boolean;
  /** IATA code of the departure airport. */
  departsFrom?: string;
  airline?: string;
  /** Hold baggage per person, in kg. */
  baggageKg?: number;
  /** Cabin trolley per person, in kg. */
  cabinKg?: number;
  liftPassDays?: number;
  /** A lift pass is in the package, where the page says so without a day
   *  count — some say only "SKI PASS included." */
  liftPass?: boolean;
}

/** The airports these operators actually fly from, for a readable label. */
const AIRPORT_CITY: Record<string, string> = {
  TLV: "Tel Aviv",
  HFA: "Haifa",
};

export function airportLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const city = AIRPORT_CITY[code.toUpperCase()];
  return city ? `${city} (${code.toUpperCase()})` : code;
}

/**
 * Where an offer sits for the flights filter.
 *
 * The offer's own statement wins. A source classified `varies` — Ophir, whose
 * cards never mention a flight — still answers `included` for the rows whose
 * promotion page spells out two legs from Tel Aviv.
 */
export function flightStatus(source: string, stated?: boolean): FlightStatus {
  if (stated === true) return "included";
  if (stated === false) return "land-only";
  const entry = SOURCE_INCLUSIONS[source];
  if (!entry) return "unknown";
  if (entry.flights === "yes") return "included";
  if (entry.flights === "no") return "land-only";
  return "unknown";
}

export function inclusionsFor(source: string): SourceInclusions | undefined {
  return SOURCE_INCLUSIONS[source];
}

/**
 * The operator's habit, overwritten by whatever this offer actually says.
 *
 * Only the fields the offer states are replaced, and stating one of them
 * lifts the confidence to high for that offer: it was read off the page the
 * shopper is about to open, not inferred from the operator's marketing.
 */
export function offerInclusions(
  source: string,
  stated: StatedInclusions
): SourceInclusions | undefined {
  const base = SOURCE_INCLUSIONS[source];
  if (!base) return undefined;

  const liftPass =
    stated.liftPassDays !== undefined ? stated.liftPassDays > 0 : stated.liftPass;

  const says =
    stated.flights !== undefined ||
    stated.transfers !== undefined ||
    liftPass !== undefined;
  if (!says) return base;

  return {
    ...base,
    flights: stated.flights === undefined ? base.flights : stated.flights ? "yes" : "no",
    transfers: stated.transfers === undefined ? base.transfers : stated.transfers ? "yes" : "no",
    liftPass: liftPass === undefined ? base.liftPass : liftPass ? "yes" : "no",
    ...(stated.departsFrom ? { departsFrom: airportLabel(stated.departsFrom) } : {}),
    confidence: "high",
    evidence: "this offer's own page on the operator's site",
  };
}

export const FLIGHT_FILTER_LABEL: Record<FlightStatus, string> = {
  included: "Flights included",
  "land-only": "Accommodation only",
  unknown: "Not stated",
};
