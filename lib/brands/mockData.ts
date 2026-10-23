import { brands } from "./config";
import type { BrandData, BrandOfferRow } from "./types";

// Only Club Med has real rows for now. Every other brand resolves to an
// empty, zero-stat entry so the table/charts shape never has to change
// when a brand "graduates" to having real data — see lib/brands/config.ts.
const clubMedRows: BrandOfferRow[] = [
  { id: "cm-1", brandSlug: "clubmed", brandName: "Club Med", resort: "Val Thorens", country: "France", season: "Dec–Apr", nights: 7, pricePerPerson: 1890, rating: 4.6, availability: "Available" },
  { id: "cm-2", brandSlug: "clubmed", brandName: "Club Med", resort: "Tignes", country: "France", season: "Dec–Apr", nights: 7, pricePerPerson: 1650, rating: 4.4, availability: "Limited" },
  { id: "cm-3", brandSlug: "clubmed", brandName: "Club Med", resort: "Peisey-Vallandry", country: "France", season: "Dec–Apr", nights: 7, pricePerPerson: 1420, rating: 4.3, availability: "Available" },
  { id: "cm-4", brandSlug: "clubmed", brandName: "Club Med", resort: "Arcs Panorama", country: "France", season: "Dec–Apr", nights: 4, pricePerPerson: 990, rating: 4.5, availability: "Available" },
  { id: "cm-5", brandSlug: "clubmed", brandName: "Club Med", resort: "Val d'Isère", country: "France", season: "Jan–Mar", nights: 7, pricePerPerson: 2290, rating: 4.7, availability: "Sold out" },
  { id: "cm-6", brandSlug: "clubmed", brandName: "Club Med", resort: "Grand Massif Samoëns", country: "France", season: "Dec–Apr", nights: 7, pricePerPerson: 1540, rating: 4.2, availability: "Available" },
  { id: "cm-7", brandSlug: "clubmed", brandName: "Club Med", resort: "Serre Chevalier", country: "France", season: "Dec–Mar", nights: 7, pricePerPerson: 1380, rating: 4.1, availability: "Limited" },
  { id: "cm-8", brandSlug: "clubmed", brandName: "Club Med", resort: "St. Moritz Roi Soleil", country: "Switzerland", season: "Dec–Apr", nights: 7, pricePerPerson: 2690, rating: 4.8, availability: "Available" },
];

function statsFor(rows: BrandOfferRow[]) {
  if (rows.length === 0) return null;
  const avgRating = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  const avgPrice = rows.reduce((s, r) => s + r.pricePerPerson, 0) / rows.length;
  return {
    bookings: rows.length,
    avgRating: Math.round(avgRating * 10) / 10,
    avgPrice: Math.round(avgPrice),
  };
}

export function getAllBrandsData(): BrandData[] {
  return brands.map((brand) => {
    const rows = brand.slug === "clubmed" ? clubMedRows : [];
    return {
      slug: brand.slug,
      name: brand.name,
      hasData: rows.length > 0,
      stats: statsFor(rows),
      rows,
    };
  });
}
