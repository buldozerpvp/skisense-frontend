"use client";

import { Box, Stack } from "@mui/material";
import { PriceSwarm } from "@/features/analytics/swarm/components/PriceSwarm";
import { AnalyticsSection } from "@/features/analytics/components/AnalyticsSection";

export const AnalyticsPane = () => {
  return (
    <Stack spacing={{ xs: 3, md: 5 }}>
      <Box component="section">
        <PriceSwarm />
      </Box>
      <Box component="section">
        <AnalyticsSection />
      </Box>
    </Stack>
  );
};
