"use client";

import { BRANDS } from "@/features/brands/constants";
import { BrandTile } from "@/features/brands/components/BrandTile";

export const BrandTileGrid = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4 sm:justify-start sm:gap-6">
      {BRANDS.map((brand, index) => (
        <BrandTile key={brand.slug} brand={brand} index={index} />
      ))}
    </div>
  );
};
