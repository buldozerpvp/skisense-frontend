import type { ResortPhoto } from "./resort-info";

/**
 * Photographs of the properties themselves, keyed by `hotelKey`.
 *
 * This file is nearly empty on purpose. Freely-licensed photography of a
 * three-star ski hotel essentially does not exist: a mountain is photographed
 * by thousands of visitors who upload under open licences, while a hotel's
 * pictures are shot by the hotel and stay the hotel's. A sweep of all 69
 * tracked properties against Wikimedia Commons found exactly five that are
 * genuinely the property — the rest matched English pubs called The Lion
 * Hotel, a Marco Polo in Hong Kong, icebergs in Greenland, and a town hall in
 * Styria.
 *
 * So every entry here was confirmed by eye, and nothing is added on a name
 * match alone. A wrong hotel photo is worse than no hotel photo: it is a
 * picture of a building the traveller will not be staying in, shown next to a
 * price they might pay for it.
 *
 * To fill this out properly you need a source that licenses hotel imagery —
 * an affiliate content API (Booking.com, Expedia) grants exactly that, and
 * their terms cover display — or the hotels' own permission, or photographs
 * uploaded by whoever runs the site. The carousel reads whatever is here, so
 * adding a source later means filling this map, not rewriting the UI.
 */
export const HOTEL_PHOTOS: Record<string, ResortPhoto[]> = {
  "les-menuires|bruyeres": [
    {
      file: "Les Bruyères from Mellifera, Les Menuires.jpg",
      width: 5918,
      height: 3935,
      licence: "CC0",
      author: "DimiTalen",
    },
    {
      file: "Hôtel Les Bruyères - panoramio.jpg",
      width: 4438,
      height: 2304,
      licence: "CC BY 3.0",
      author: "qwesy qwesy",
    },
  ],
  "les-menuires|neigeciel": [
    {
      file: "Belambra Club Neige et Ciel, Les Menuires, 2022.jpg",
      width: 4000,
      height: 2667,
      licence: "CC0",
      author: "DimiTalen",
    },
  ],
  "borovets|samokov": [
    {
      file: "Borovets Hotel Samokov.jpg",
      width: 2304,
      height: 3072,
      licence: "Public domain",
      author: "Angel Ivanov Angelov",
    },
  ],
  "borovets|rila": [
    {
      file: "Borovets Hotel Rila.jpg",
      width: 2304,
      height: 3072,
      licence: "Public domain",
      author: "Angel Ivanov Angelov",
    },
    {
      file: "Borovets Hotel Rila 2.jpg",
      width: 2304,
      height: 3072,
      licence: "Public domain",
      author: "Angel Ivanov Angelov",
    },
  ],
  "bansko|platinumcasino": [
    {
      file: "PLATINUM CASINO ^ HOTEL - panoramio.jpg",
      width: 5184,
      height: 3456,
      licence: "CC BY 3.0",
      author: "edykbo",
    },
    {
      file: "PLATINUM CASINO ^ HOTEL - panoramio (1).jpg",
      width: 5184,
      height: 3456,
      licence: "CC BY 3.0",
      author: "edykbo",
    },
  ],
};

/** Photos of this exact property, or an empty list. */
export function hotelPhotos(hotelKey: string | undefined): ResortPhoto[] {
  return (hotelKey && HOTEL_PHOTOS[hotelKey]) || [];
}
