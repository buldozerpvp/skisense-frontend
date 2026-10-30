
export type PropertyType = "hotel" | "club" | "apartment" | "chalet";

export type OfferStatus = "green" | "orange" | "default";

export interface PriceRow {
  resortId: string;
  resort: string;
  resortKey?: string;
  hotel?: string;
  hotelKey?: string;
  propertyType?: PropertyType;
  board?: string;
  country: string;
  date: string;
  nights?: number;
  priceEur: number;
  pax?: number;
  departsFrom?: string;
  transfers?: boolean;
  flights?: boolean;
  airline?: string;
  baggageKg?: number;
  cabinKg?: number;
  liftPassDays?: number;
  liftPass?: boolean;
  status: OfferStatus;
  url?: string;
}

export interface SourceOffers {
  source: string;
  day: string | null;
  data: PriceRow[];
}

export interface SourceOfferHistory {
  source: string;
  days: { day: string; data: PriceRow[] }[];
}
