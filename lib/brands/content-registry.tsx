import type { ReactNode } from "react";
import { ClubMedContent } from "@/components/brands/clubmed/ClubMedContent";
import { BrandOffersContent } from "@/components/brands/BrandOffersContent";

// Maps a brand slug to its page content. A brand with no entry here
// (or hasContent: false in config.ts) falls back to <ComingSoon />.
export const brandContentRegistry: Record<string, () => ReactNode> = {
  clubmed: () => <ClubMedContent />,
  skideal: () => (
    <BrandOffersContent slug="skideal" tagline="Ski packages from Israel — mixed trip lengths" />
  ),
  pingwin: () => (
    <BrandOffersContent slug="pingwin" tagline="Ski holidays from Israel — per-person from-prices" />
  ),
  issta: () => (
    <BrandOffersContent slug="issta" tagline="Flight-and-hotel ski packages from Tel Aviv" />
  ),
  belambra: () => (
    <BrandOffersContent slug="belambra" tagline="French mountain clubs — Saturday-to-Saturday weeks" />
  ),
  "ofir-tours": () => (
    <BrandOffersContent slug="ofir-tours" tagline="Curated ski deals from Israel" />
  ),
};
