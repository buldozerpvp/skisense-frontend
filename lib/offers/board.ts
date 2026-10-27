/**
 * Board basis and room occupancy, normalised across six operators.
 *
 * Each one writes the same thing differently — "ארוחת בוקר", "Half board",
 * "DPIND", nothing at all — so a traveller comparing two rows cannot tell
 * whether dinner is in the price. This maps every spelling we have seen onto
 * one scale, and leaves anything unrecognised as `unknown` rather than
 * guessing: "we don't know what meals are included" is a fair thing to show,
 * and "breakfast" when it is room-only is not.
 */
export type BoardBasis =
  | "room-only"
  | "breakfast"
  | "half-board"
  | "full-board"
  | "all-inclusive"
  | "unknown";

export const BOARD_LABEL: Record<BoardBasis, string> = {
  "room-only": "Room only",
  breakfast: "Breakfast",
  "half-board": "Half board",
  "full-board": "Full board",
  "all-inclusive": "All inclusive",
  unknown: "Board not stated",
};

/** What each level actually buys, for the offer sheet. */
export const BOARD_DETAIL: Record<BoardBasis, string> = {
  "room-only": "No meals — you eat out or cook.",
  breakfast: "Breakfast each morning. Lunch and dinner are on you.",
  "half-board": "Breakfast and dinner. Lunch on the mountain is extra.",
  "full-board": "Breakfast, lunch and dinner.",
  "all-inclusive": "All meals plus drinks through the day.",
  unknown: "The operator doesn't say which meals are in this price.",
};

export const BOARD_ICON: Record<BoardBasis, string> = {
  "room-only": "🛏",
  breakfast: "🥐",
  "half-board": "🍽",
  "full-board": "🍽",
  "all-inclusive": "🥂",
  unknown: "–",
};

/** Ordered so a filter reads from least to most included. */
export const BOARD_ORDER: BoardBasis[] = [
  "room-only",
  "breakfast",
  "half-board",
  "full-board",
  "all-inclusive",
  "unknown",
];

// Hebrew from the Israeli operators, English and board codes from Belambra.
//
// Order is the whole trick: these are tested top to bottom and the first hit
// wins, so every pattern must be more specific than the ones below it.
// "ארוחות בוקר וערב" (breakfast and dinner) is half board and contains the
// word for breakfast — tested after the breakfast line it reads as breakfast,
// and dinner quietly disappears from the price. Likewise "ארוחות בוקר,
// צהריים וערב" is full board and contains both of the others.
//
// The operators also write the same meal several ways: Skideal pluralises
// ("ארוחות בוקר") and adds where it is served ("במלון", "בקלאב", "במסעדה
// כשרה"), Issta hyphenates ("ארוחת-בוקר") and marks kosher half board
// ("חצי פנסיון כשר"), and its package list says it in English as "B&B". All
// of those are the same four or five things.
const PATTERNS: [RegExp, BoardBasis][] = [
  [/הכל\s*כלול|all\s*inclusive|^AIIND$/i, "all-inclusive"],
  [
    /בוקר\s*,?\s*צהריים\s*וערב|פנסיון\s*מלא|full\s*board|^FB$|^PC(RM)?IND$/i,
    "full-board",
  ],
  [
    /חצי\s*פנסיון|בוקר\s*וערב|half\s*board|^HB$|^DP(RM)?IND$/i,
    "half-board",
  ],
  [
    /ארוחו?ת[\s-]*בוקר|לינה\s*וארוחת|bed\s*(and|&)\s*breakfast|B\s*&\s*B|breakfast|^BB$/i,
    "breakfast",
  ],
  [/לינה\s*בלב|room\s*only|self[-\s]?catering|^LOC$/i, "room-only"],
];

/**
 * One operator's board string onto the scale.
 *
 * Ofir Tours prints the party in the same strip as the board, so "3 מבוגרים"
 * can arrive here; it matches nothing and comes back unknown, which is right.
 */
export function normaliseBoard(raw: string | undefined): BoardBasis {
  if (!raw) return "unknown";
  const text = raw.trim();
  for (const [pattern, board] of PATTERNS) {
    if (pattern.test(text)) return board;
  }
  return "unknown";
}

/** Where an operator sells one board basis and never writes it on the offer. */
const SOURCE_DEFAULT: Record<string, BoardBasis> = {
  // Their winter villages are all-inclusive by construction: three meals,
  // open bar and lessons are the product, stated on every village page.
  clubmed: "all-inclusive",
};

export function boardFor(source: string, raw: string | undefined): BoardBasis {
  const fromRow = normaliseBoard(raw);
  if (fromRow !== "unknown") return fromRow;
  return SOURCE_DEFAULT[source] ?? "unknown";
}

/**
 * How many people the room sleeps, as the operator priced it.
 *
 * This is the party the price assumes, not a capacity: an offer quoted for two
 * is a different product from the same room quoted for three, which is why
 * `pax` drives the price and this label.
 */
export function roomLabel(pax: number): string {
  if (pax === 1) return "Single";
  if (pax === 2) return "Double";
  return `Room for ${pax}`;
}

/** Short form for a dense list row. */
export function roomShort(pax: number): string {
  return pax === 2 ? "double" : pax === 1 ? "single" : `${pax}-bed`;
}
