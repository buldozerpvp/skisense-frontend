"use client";

import { BRANDS } from "@/lib/brands/config";
import { BrandWidget } from "./BrandWidget";

/** Row of circular brand logos on the home page. */
export function BrandWidgetGrid() {
  return (
    <div className="flex flex-wrap justify-center gap-4 sm:justify-start sm:gap-6">
      {BRANDS.map((brand, index) => (
        <BrandWidget key={brand.slug} brand={brand} index={index} />
      ))}
    </div>
  );
}
