import type { PriceRow } from "@/lib/brands/types";

/** Every operator here quotes a two-adult room unless the offer says otherwise. */
export const DEFAULT_PAX = 2;

/** Party sizes the per-person column can be split by. */
export const PARTY_SIZES = [1, 2, 3, 4, 5, 6] as const;

/** How many people this offer's per-person price assumes sharing. */
export function paxOf(row: PriceRow): number {
  return row.pax ?? DEFAULT_PAX;
}

/**
 * What the booking costs in total.
 *
 * Operators quote in different units — Issta prices a party, Ophir Tours
 * prices a person in a room of two or three — so the collectors store one
 * per-person figure plus the party it assumes, and the total is the product.
 * The total is what the table leads with, because it's the number you pay.
 */
export function totalPrice(row: PriceRow): number {
  return Math.round(row.priceEur * paxOf(row));
}

/**
 * The total split a given number of ways.
 *
 * This is arithmetic, not an operator quote: hotels don't price a party of
 * four at twice a party of two, so at any size other than the one the offer
 * was sold for this is "what it works out at each", not a bookable price.
 */
export function pricePerPerson(row: PriceRow, partySize: number): number {
  return Math.round(totalPrice(row) / Math.max(partySize, 1));
}

/** The travelling-party picker's value: a size, or every size at once. */
export type PartyChoice = number | "any";

/**
 * Does this offer cover a party of that size?
 *
 * Operators sell a room, not a seat: an offer priced for two is a different
 * product from the same hotel priced for three, so "travelling four" means
 * "show me the offers sold for four", not "divide a couple's price by four".
 */
export function fitsParty(row: PriceRow, choice: PartyChoice): boolean {
  return choice === "any" || paxOf(row) === choice;
}
