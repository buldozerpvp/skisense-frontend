
export interface CountryBadge {
  flag: string;
  code: string;
  name: string;
}

const COUNTRIES: Record<string, CountryBadge> = {};

const register = (names: string[], badge: CountryBadge) => {
  for (const name of names) COUNTRIES[name.trim().toLowerCase()] = badge;
};

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

export const countryBadge = (country: string | undefined): CountryBadge => {
  const known = COUNTRIES[(country ?? "").trim().toLowerCase()];
  if (known) return known;
  const raw = (country ?? "").trim();
  if (!raw) return { flag: "", code: "—", name: "Unknown" };
  return { flag: "", code: raw.slice(0, 3).toUpperCase(), name: raw };
};
