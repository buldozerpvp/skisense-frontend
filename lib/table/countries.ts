/**
 * Country display helpers.
 *
 * The Israeli operators all write the country in Hebrew, so the stored
 * `country` field is Hebrew text (see Backend/src/resorts/resort-catalogue.ts,
 * which keeps `country` and `countryHe` side by side). The table shows a flag
 * and a three-letter code instead: it reads the same in any locale, it fits in
 * a few pixels at the end of a row, and it doesn't flip the line direction the
 * way a Hebrew word does.
 */

export interface CountryBadge {
  /** Regional-indicator flag, or an empty string when we don't know the country. */
  flag: string;
  /** ISO 3166 alpha-3, e.g. "FRA". */
  code: string;
  /** English country name, for tooltips and the Country column. */
  name: string;
}

/** Keyed by both spellings so a row works before and after the backfill. */
const COUNTRIES: Record<string, CountryBadge> = {};

function register(names: string[], badge: CountryBadge) {
  for (const name of names) COUNTRIES[name.trim().toLowerCase()] = badge;
}

register(["צרפת", "France"], { flag: "🇫🇷", code: "FRA", name: "France" });
register(["אוסטריה", "Austria"], { flag: "🇦🇹", code: "AUT", name: "Austria" });
register(["איטליה", "Italy"], { flag: "🇮🇹", code: "ITA", name: "Italy" });
register(["שוויץ", "שווייץ", "Switzerland"], { flag: "🇨🇭", code: "CHE", name: "Switzerland" });
register(["בולגריה", "Bulgaria"], { flag: "🇧🇬", code: "BGR", name: "Bulgaria" });
register(["אנדורה", "Andorra"], { flag: "🇦🇩", code: "AND", name: "Andorra" });
register(["גאורגיה", "גיאורגיה", "Georgia"], { flag: "🇬🇪", code: "GEO", name: "Georgia" });
register(["מקדוניה", "צפון מקדוניה", "North Macedonia"], {
  flag: "🇲🇰",
  code: "MKD",
  name: "North Macedonia",
});
register(["קנדה", "Canada"], { flag: "🇨🇦", code: "CAN", name: "Canada" });

/**
 * The badge for a stored country string. Unknown countries fall back to the
 * first three letters rather than disappearing — a new source going live
 * should look odd, not silently lose its country.
 */
export function countryBadge(country: string | undefined): CountryBadge {
  const known = COUNTRIES[(country ?? "").trim().toLowerCase()];
  if (known) return known;
  const raw = (country ?? "").trim();
  if (!raw) return { flag: "", code: "—", name: "Unknown" };
  return { flag: "", code: raw.slice(0, 3).toUpperCase(), name: raw };
}
