import type { ResortPhoto } from "@/features/resorts/lib/resortCatalogue";

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

export const hotelPhotos = (hotelKey: string | undefined): ResortPhoto[] => {
  return (hotelKey && HOTEL_PHOTOS[hotelKey]) || [];
};
