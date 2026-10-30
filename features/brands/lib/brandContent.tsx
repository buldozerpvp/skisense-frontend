import type { ReactNode } from "react";
import { ClubMedContent } from "@/features/brands/clubmed/components/ClubMedContent";
import { BrandOffers } from "@/features/brands/components/BrandOffers";

export const brandContentRegistry: Record<string, () => ReactNode> = {
  clubmed: () => <ClubMedContent />,
  skideal: () => (
    <BrandOffers slug="skideal" tagline="Ski packages from Israel — mixed trip lengths" />
  ),
  pingwin: () => (
    <BrandOffers slug="pingwin" tagline="Ski holidays from Israel — per-person from-prices" />
  ),
  issta: () => (
    <BrandOffers slug="issta" tagline="Flight-and-hotel ski packages from Tel Aviv" />
  ),
  belambra: () => (
    <BrandOffers slug="belambra" tagline="French mountain clubs — Saturday-to-Saturday weeks" />
  ),
  "ofir-tours": () => (
    <BrandOffers slug="ofir-tours" tagline="Curated ski deals from Israel" />
  ),
};
