import { Box, Container } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { AnalyticsSection } from "@/components/charts/AnalyticsSection";
import { Responsive } from "@/components/mobile/Responsive";
import { MobileAnalytics } from "@/components/mobile/MobileAnalytics";

/** Analytics, reached from the pill in the top bar on a phone. */
export default function AnalyticsPage() {
  return (
    <Responsive
      mobile={<MobileAnalytics />}
      desktop={
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
          <Box component="section">
            <SectionHeading
              icon={<InsightsRoundedIcon fontSize="small" />}
              title="Price analytics"
              subtitle="What a ski week costs right now, what changed overnight — press play to watch it move."
            />
            <AnalyticsSection />
          </Box>
        </Container>
      }
    />
  );
}
