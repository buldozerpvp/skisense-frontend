export type Inclusion = "yes" | "no" | "varies";

export interface SourceInclusions {
  flights: Inclusion;
  transfers: Inclusion;
  liftPass: Inclusion;
  departsFrom?: string;
  note: string;
  confidence: "high" | "medium" | "low";
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
    evidence: "issta.co.il/ski FAQ, and DepartureCode=TLV on every option in their own API",
  },
  clubmed: {
    flights: "yes",
    transfers: "yes",
    liftPass: "yes",
    departsFrom: "Tel Aviv",
    note: "All-inclusive: flights from Tel Aviv, transfers, 6-day lift pass, meals, drinks and lessons. Equipment hire is extra.",
    confidence: "high",
    evidence: "clubmed.co.il calendar priced with and without departureCity=TLV",
  },
  pingwin: {
    flights: "yes",
    transfers: "yes",
    liftPass: "varies",
    departsFrom: "Tel Aviv or Haifa",
    note: "Flight and transfers included. Some departures leave from Haifa, and the lift pass is not in every package.",
    confidence: "medium",
    evidence: "pingwin.co.il package pages, 'המחיר כולל' section",
  },
  skideal: {
    flights: "yes",
    transfers: "yes",
    liftPass: "varies",
    note: "Flight and transfers included — the operator never states which airport it leaves from.",
    confidence: "medium",
    evidence: "skideal.co.il 'הרכב החבילה' list on each /site/ and /hotel/ page",
  },
  "ofir-tours": {
    flights: "varies",
    transfers: "yes",
    liftPass: "varies",
    note: "Transfers included. Flights only on their full packages — this price may be land only.",
    confidence: "low",
    evidence: "ophirtours.co.il listing tags and ski FAQ wording",
  },
  belambra: {
    flights: "no",
    transfers: "no",
    liftPass: "varies",
    note: "Accommodation only — a French domestic product, no flights or transfers. Some boards add the lift pass.",
    confidence: "high",
    evidence: "belambra.com ski listing legend and board codes",
  },
};

export type FlightStatus = "included" | "land-only" | "unknown";

export interface StatedInclusions {
  flights?: boolean;
  transfers?: boolean;
  departsFrom?: string;
  airline?: string;
  baggageKg?: number;
  cabinKg?: number;
  liftPassDays?: number;
  liftPass?: boolean;
}

const AIRPORT_CITY: Record<string, string> = {
  TLV: "Tel Aviv",
  HFA: "Haifa",
};

export const airportLabel = (code: string | undefined): string | undefined => {
  if (!code) return undefined;
  const city = AIRPORT_CITY[code.toUpperCase()];
  return city ? `${city} (${code.toUpperCase()})` : code;
};

export const flightStatus = (source: string, stated?: boolean): FlightStatus => {
  if (stated === true) return "included";
  if (stated === false) return "land-only";
  const entry = SOURCE_INCLUSIONS[source];
  if (!entry) return "unknown";
  if (entry.flights === "yes") return "included";
  if (entry.flights === "no") return "land-only";
  return "unknown";
};

export const inclusionsFor = (source: string): SourceInclusions | undefined => {
  return SOURCE_INCLUSIONS[source];
};

export const offerInclusions = (source: string, stated: StatedInclusions): SourceInclusions | undefined => {
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
};

export const FLIGHT_FILTER_LABEL: Record<FlightStatus, string> = {
  included: "Flights included",
  "land-only": "Accommodation only",
  unknown: "Not stated",
};
