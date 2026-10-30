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

export const BOARD_ORDER: BoardBasis[] = [
  "room-only",
  "breakfast",
  "half-board",
  "full-board",
  "all-inclusive",
  "unknown",
];

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

export const normaliseBoard = (raw: string | undefined): BoardBasis => {
  if (!raw) return "unknown";
  const text = raw.trim();
  for (const [pattern, board] of PATTERNS) {
    if (pattern.test(text)) return board;
  }
  return "unknown";
};

const SOURCE_DEFAULT: Record<string, BoardBasis> = {
  clubmed: "all-inclusive",
};

export const boardFor = (source: string, raw: string | undefined): BoardBasis => {
  const fromRow = normaliseBoard(raw);
  if (fromRow !== "unknown") return fromRow;
  return SOURCE_DEFAULT[source] ?? "unknown";
};

export const roomLabel = (pax: number): string => {
  if (pax === 1) return "Single";
  if (pax === 2) return "Double";
  return `Room for ${pax}`;
};

export const roomShort = (pax: number): string => {
  return pax === 2 ? "double" : pax === 1 ? "single" : `${pax}-bed`;
};
