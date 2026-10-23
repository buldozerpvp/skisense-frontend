"use client";

import Grid from "@mui/material/Grid2";
import { brands } from "@/lib/brands/config";
import { BrandCard } from "./BrandCard";

export function BrandGrid() {
  return (
    <Grid container spacing={2}>
      {brands.map((brand, index) => (
        <Grid key={brand.slug} size={{ xs: 6, sm: 4, md: 2 }}>
          <BrandCard brand={brand} index={index} />
        </Grid>
      ))}
    </Grid>
  );
}
