export interface Brand {
  /** URL slug, and the backend source name for brands the backend knows about
   *  (see Backend/src/sources) — keep these in sync so a brand's data shows
   *  up the moment that source is implemented. */
  slug: string;
  name: string;
  /** Path under /public to the brand's logo. Falls back to initials when absent (e.g. Ofir Tours). */
  logoSrc?: string;
  /** Fallback initials + background color, used only when logoSrc is missing. */
  initials: string;
  color: string;
  /** True once the backend has at least one stored day of data for this source. */
  hasContent: boolean;
  /**
   * Stay length to assume for rows stored before the backend recorded `nights`.
   * Only safe where the collector asks for one fixed duration — Club Med's
   * calendar is always queried for 7-night stays. Leave unset otherwise.
   */
  defaultNights?: number;
}

export const BRANDS: Brand[] = [
  {
    slug: "clubmed",
    name: "Club Med",
    logoSrc: "/logos/clubmed.png",
    initials: "CM",
    color: "#0A3D62",
    hasContent: true,
    defaultNights: 7,
  },
  {
    // Matches the backend's "pingwin" source (Backend/src/sources/pingwin).
    slug: "pingwin",
    name: "Pingwin",
    logoSrc: "/logos/pingwin.png",
    initials: "PW",
    color: "#1C86C4",
    // Live: scraped from Pingwin's own ski search. Stay lengths vary per
    // package (3-7 nights), so there's no default to fall back on.
    hasContent: true,
  },
  {
    slug: "belambra",
    name: "Belambra",
    // Deliberately a new filename rather than overwriting belambra.png: Next's
    // image optimizer and the browser both cache by URL, so replacing artwork
    // in place keeps serving the old mark. Give replacements a new name.
    logoSrc: "/logos/belambra-icon.png",
    initials: "BL",
    color: "#9C1368",
    // Live: prices are embedded in Belambra's own ski listing page, one
    // request per departure Saturday. Stays are Saturday to Saturday.
    hasContent: true,
    defaultNights: 7,
  },
  {
    // Matches the backend's "issta" source (Backend/src/sources/ista).
    slug: "issta",
    name: "Issta",
    logoSrc: "/logos/ista.png",
    initials: "IS",
    color: "#1A8A4A",
    // Live: Issta publishes a JSON ski catalogue; one call covers the season.
    hasContent: true,
  },
  {
    slug: "skideal",
    name: "Skideal",
    logoSrc: "/logos/skideal.png",
    initials: "SD",
    color: "#139CD8",
    // Live: collected from Skideal's own WordPress REST API. Trip lengths vary
    // per package (3–7 nights), so there's no default to fall back on.
    hasContent: true,
  },
  {
    // Matches the backend's "ofir-tours" source. Scraped from their curated
    // ski landing pages — they have no API.
    slug: "ofir-tours",
    name: "Ofir Tours",
    logoSrc: "/logos/ofir-tours.png",
    initials: "OT",
    color: "#D81E26",
    hasContent: true,
  },
];

export function getBrand(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}
