import { Box, Container } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { Responsive } from "@/features/app-shell/components/Responsive";
import { AnalyticsPane } from "@/features/analytics/components/AnalyticsPane";

const AnalyticsPage = () => {
  return (
    <Responsive
      mobile={
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 2,
            py: 2,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <AnalyticsPane />
        </Box>
      }
      desktop={
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
          <Box component="section">
            <SectionHeading
              icon={<InsightsRoundedIcon fontSize="small" />}
              title="Price analytics"
              subtitle="Every tracked offer replaying across the nights it was collected, then what a ski week costs right now and when each operator is cheapest."
            />
            <AnalyticsPane />
          </Box>
        </Container>
      }
    />
  );
};

export default AnalyticsPage;
