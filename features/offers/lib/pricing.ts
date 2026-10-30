import type { PriceRow } from "@/features/prices/lib/priceTypes";

export const DEFAULT_PAX = 2;

export const PARTY_SIZES = [1, 2, 3, 4, 5, 6] as const;

export const paxOf = (row: PriceRow): number => {
  return row.pax ?? DEFAULT_PAX;
};

export const totalPrice = (row: PriceRow): number => {
  return Math.round(row.priceEur * paxOf(row));
};

export const pricePerPerson = (row: PriceRow, partySize: number): number => {
  return Math.round(totalPrice(row) / Math.max(partySize, 1));
};

export type PartyChoice = number | "any";

export const fitsParty = (row: PriceRow, choice: PartyChoice): boolean => {
  return choice === "any" || paxOf(row) === choice;
};
