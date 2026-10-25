import { Box, Container } from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { BrandWidgetGrid } from "@/components/brand-widget/BrandWidgetGrid";
import { Responsive } from "@/components/mobile/Responsive";
import { MobileBrands } from "@/components/mobile/MobileBrands";

/** The Brands tab on a phone; on a laptop, the same grid the home page shows. */
export default function BrandsPage() {
  return (
    <Responsive
      mobile={<MobileBrands />}
      desktop={
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
          <Box component="section">
            <SectionHeading
              icon={<StorefrontRoundedIcon fontSize="small" />}
              title="Brands"
              subtitle="Pick an operator to see its own prices."
            />
            <BrandWidgetGrid />
          </Box>
        </Container>
      }
    />
  );
}
