"use client";

import { BrandOffers } from "@/features/brands/components/BrandOffers";
import { CLUB_MED_SLUG } from "@/features/brands/clubmed/constants";

export const ClubMedContent = () => {
  return <BrandOffers slug={CLUB_MED_SLUG} tagline="All-inclusive ski resorts across the Alps" />;
};
