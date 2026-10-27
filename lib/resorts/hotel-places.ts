import { resortInfo } from "./resort-info";

/**
 * Where each property actually stands, keyed by `hotelKey`.
 *
 * Geocoded through OpenStreetMap's Nominatim and then filtered twice, because
 * a search for a hotel name returns a lot of things that are not hotels: a
 * result more than 20 km from its resort was dropped (that is what stops
 * "Rila" in Borovets landing on the Rila Monastery an hour away), and so was
 * any result whose OSM type was not somewhere you can sleep — the first sweep
 * cheerfully offered a drinking fountain, a ski-lift pylon, a cinema and a
 * deli counter.
 *
 * 22 of the 69 tracked properties survived both filters. The rest fall back to
 * the resort centre, and the map says so rather than implying a precision it
 * does not have.
 */
const HOTEL_COORDS: Record<string, [number, number]> = {
  "bansko|regnum": [41.82493, 23.47262],
  "bansko|sportmpm": [41.82487, 23.47751],
  "bansko|mpmguinness": [41.831, 23.47608],
  "bansko|dumanov": [41.82743, 23.48213],
  "bansko|rila": [41.84134, 23.48088],
  "borovets|samokov": [42.26645, 23.60606],
  "borovets|iceberg": [42.26931, 23.60441],
  "orcieres|rocblanc": [44.6982, 6.32426],
  "tignes|diva": [45.45439, 6.89881],
  "tignes|levanna": [45.4684, 6.90821],
  "tignes|montana": [45.47206, 6.90697],
  "gudauri|inn": [42.46389, 44.47752],
  "gudauri|monte": [42.4768, 44.47565],
  "gudauri|atriumnew": [42.47199, 44.49358],
  "les-menuires|neigeciel": [45.32717, 6.53817],
  "arc-2000|laiguillerouge": [45.57129, 6.83228],
  "gourette|lousarri": [42.95884, -0.33068],
  "super-besse|chambourguet": [45.51073, 2.86199],
  "mayrhofen|pensionsanna": [47.16524, 11.8579],
  "mayrhofen|strass": [47.16375, 11.86086],
  "val-thorens|fahrenheitseven": [45.29527, 6.58394],
  "val-thorens|pashmina": [45.2956, 6.58737],
};

export interface HotelPlace {
  lat: number;
  lon: number;
  /** True when this is the building; false when it is the resort centre. */
  exact: boolean;
}

/**
 * The best location we have for a property: its own coordinates, or the
 * resort's. Returns undefined only when we know neither.
 */
export function hotelPlace(hotelKey?: string, resortKey?: string): HotelPlace | undefined {
  const own = hotelKey ? HOTEL_COORDS[hotelKey] : undefined;
  if (own) return { lat: own[0], lon: own[1], exact: true };

  const resort = resortInfo(resortKey);
  if (resort?.lat !== undefined && resort?.lon !== undefined) {
    return { lat: resort.lat, lon: resort.lon, exact: false };
  }
  return undefined;
}
