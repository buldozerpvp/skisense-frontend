import type { PriceRow, PropertyType } from "@/features/prices/lib/priceTypes";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  hotel: "Hotel",
  club: "Club",
  apartment: "Apartment",
  chalet: "Chalet",
};

export const PROPERTY_TYPE_ICON: Record<PropertyType, string> = {
  hotel: "🏨",
  club: "🎿",
  apartment: "🏢",
  chalet: "🏡",
};

export const DEFAULT_PROPERTY_TYPES: PropertyType[] = ["hotel", "club"];

export const propertyTypeOf = (row: PriceRow): PropertyType => {
  return row.propertyType ?? "hotel";
};

export const hotelLabels = (rows: PriceRow[]): Map<string, string> => {
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
};

const compareSpellings = (a: string, b: string): number => {
  const marks = (s: string) => (/['’À-ɏ]/.test(s) ? 0 : 1);
  return marks(a) - marks(b) || a.length - b.length || a.localeCompare(b);
};

export const hotelLabelOf = (row: PriceRow, labels: Map<string, string>): string | undefined => {
  return (row.hotelKey ? labels.get(row.hotelKey) : undefined) ?? row.hotel;
};
