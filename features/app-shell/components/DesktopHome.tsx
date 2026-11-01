"use client";

import { Box, Container, Stack } from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import { Hero } from "@/features/app-shell/components/Hero";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { BrandTileGrid } from "@/features/brands/components/BrandTileGrid";
import { OffersTable } from "@/features/offers/components/OffersTable";

export const DesktopHome = () => {
  return (
    <>
      <Hero />
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
        <Stack spacing={{ xs: 5, md: 7 }}>
          <Box component="section">
            <SectionHeading
              icon={<StorefrontRoundedIcon fontSize="small" />}
              title="Brands"
              subtitle="Pick an operator to see its own prices, or browse everything below."
            />
            <BrandTileGrid />
          </Box>

          <Box component="section">
            <SectionHeading
              icon={<TableRowsRoundedIcon fontSize="small" />}
              title="All offers"
              subtitle="Every tracked departure, with a link out to each operator's own page. Filter by resort, hotel, country, stay length or date — and save the view."
            />
            <OffersTable />
          </Box>
        </Stack>
      </Container>
    </>
  );
};
