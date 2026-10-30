export interface Brand {
  slug: string;
  name: string;
  logoSrc?: string;
  initials: string;
  color: string;
  hasContent: boolean;
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
    slug: "pingwin",
    name: "Pingwin",
    logoSrc: "/logos/pingwin.png",
    initials: "PW",
    color: "#1C86C4",
    hasContent: true,
  },
  {
    slug: "belambra",
    name: "Belambra",
    logoSrc: "/logos/belambra-icon.png",
    initials: "BL",
    color: "#9C1368",
    hasContent: true,
    defaultNights: 7,
  },
  {
    slug: "issta",
    name: "Issta",
    logoSrc: "/logos/ista.png",
    initials: "IS",
    color: "#1A8A4A",
    hasContent: true,
  },
  {
    slug: "skideal",
    name: "Skideal",
    logoSrc: "/logos/skideal.png",
    initials: "SD",
    color: "#139CD8",
    hasContent: true,
  },
  {
    slug: "ofir-tours",
    name: "Ofir Tours",
    logoSrc: "/logos/ofir-tours.png",
    initials: "OT",
    color: "#D81E26",
    hasContent: true,
  },
];

export const getBrand = (slug: string): Brand | undefined => {
  return BRANDS.find((b) => b.slug === slug);
};
