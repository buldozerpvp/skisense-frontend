import { Box, Container } from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { BrandTileGrid } from "@/features/brands/components/BrandTileGrid";
import { Responsive } from "@/features/app-shell/components/Responsive";
import { BrandsScreen } from "@/features/brands/components/BrandsScreen";

const BrandsPage = () => {
  return (
    <Responsive
      mobile={<BrandsScreen />}
      desktop={
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
          <Box component="section">
            <SectionHeading
              icon={<StorefrontRoundedIcon fontSize="small" />}
              title="Brands"
              subtitle="Pick an operator to see its own prices."
            />
            <BrandTileGrid />
          </Box>
        </Container>
      }
    />
  );
};

export default BrandsPage;
