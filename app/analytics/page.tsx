import { Box, Container } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { AnalyticsSection } from "@/features/analytics/components/AnalyticsSection";
import { Responsive } from "@/features/app-shell/components/Responsive";
import { AnalyticsScreen } from "@/features/analytics/components/AnalyticsScreen";

const AnalyticsPage = () => {
  return (
    <Responsive
      mobile={<AnalyticsScreen />}
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
};

export default AnalyticsPage;
