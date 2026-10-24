import type { PriceRow, PropertyType } from "@/lib/brands/types";

/** How each type reads in the table and its filter. */
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  hotel: "Hotel",
  club: "Club",
  apartment: "Apartment",
  chalet: "Chalet",
};

/** A small badge, so the type reads at a glance in a narrow column. */
export const PROPERTY_TYPE_ICON: Record<PropertyType, string> = {
  hotel: "🏨",
  club: "🎿",
  apartment: "🏢",
  // A hut emoji would be apter, but it renders as a blank box on Windows.
  chalet: "🏡",
};

/** Catered places. The table opens showing only these. */
export const DEFAULT_PROPERTY_TYPES: PropertyType[] = ["hotel", "club"];

/**
 * The row's type, treating an unclassified row as a hotel. That keeps old rows
 * inside the table's default hotel-and-club filter: classified as anything
 * else they would vanish from the opening view without explanation.
 */
export function propertyTypeOf(row: PriceRow): PropertyType {
  return row.propertyType ?? "hotel";
}

/**
 * One display name per hotel, shared by every operator selling it.
 *
 * The backend already gives rows that are the same property the same
 * `hotelKey`, and rewrites the name wherever a verified catalogue entry says
 * what the property is really called. For the rest — the ones matched by rule
 * alone — the operators' spellings still differ ("Marco Polo" and "Marco Polo
 * Gudauri"), so one is picked for the whole group: the shortest, since the
 * extra words are almost always the resort or a marketing suffix, preferring
 * a spelling that kept its accents and apostrophes.
 */
export function hotelLabels(rows: PriceRow[]): Map<string, string> {
  const byKey = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.hotelKey || !row.hotel) continue;
    const names = byKey.get(row.hotelKey) ?? [];
    if (!names.includes(row.hotel)) names.push(row.hotel);
    byKey.set(row.hotelKey, names);
  }

  const labels = new Map<string, string>();
  for (const [key, names] of byKey) {
    labels.set(key, [...names].sort(compareSpellings)[0]);
  }
  return labels;
}

/** Punctuation-bearing first, then shortest, then alphabetical for stability. */
function compareSpellings(a: string, b: string): number {
  const marks = (s: string) => (/['’À-ɏ]/.test(s) ? 0 : 1);
  return marks(a) - marks(b) || a.length - b.length || a.localeCompare(b);
}

/** The label for one row: the group's shared name, or the row's own. */
export function hotelLabelOf(row: PriceRow, labels: Map<string, string>): string | undefined {
  return (row.hotelKey ? labels.get(row.hotelKey) : undefined) ?? row.hotel;
}
