"use client";

import { useMemo } from "react";
import { Box, Container, Stack, Typography, Skeleton } from "@mui/material";
import { motion } from "framer-motion";
import { useLatestOffers } from "@/features/prices/hooks/usePrices";
import { BRANDS } from "@/features/brands/constants";
import { COLORS, DURATION, EASING, RADIUS } from "@/shared/design/tokens";

const useHeroStats = () => {
  const { data, isLoading } = useLatestOffers();

  const stats = useMemo(() => {
    const rows = data?.flatMap((source) => source.data) ?? [];
    const cheapest = rows.length ? Math.min(...rows.map((r) => r.priceEur)) : null;
    return {
      offers: rows.length,
      resorts: new Set(rows.map((r) => r.resort)).size,
      operators: BRANDS.filter((b) => b.hasContent).length,
      cheapest,
    };
  }, [data]);

  return { ...stats, isLoading };
};

export const Hero = () => {
  const { offers, resorts, operators, cheapest, isLoading } = useHeroStats();

  const items = [
    { label: "Offers tracked", value: offers.toLocaleString() },
    { label: "Resorts", value: String(resorts) },
    { label: "Operators live", value: `${operators} of ${BRANDS.length}` },
    { label: "Cheapest week", value: cheapest ? `€${cheapest.toLocaleString()}` : "—", accent: true },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid",
        borderColor: "divider",
        background: `linear-gradient(170deg, ${COLORS.frost} 0%, ${COLORS.surface} 65%)`,
      }}
    >
      <Box
        aria-hidden
        className="blueprint-grid"
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 85%)",
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", py: { xs: 5, md: 7 }, px: { xs: 2, md: 3 } }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: EASING }}
        >
          <Typography
            variant="overline"
            sx={{ color: COLORS.sky, display: "block", mb: 1 }}
          >
            Alpine price intelligence
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: 32, sm: 42, md: 50 }, maxWidth: 760, lineHeight: 1.1 }}
          >
            Every ski week,{" "}
            <Box component="span" sx={{ color: COLORS.sky }}>
              one price list
            </Box>
            .
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2, maxWidth: 560, fontSize: { xs: 15, md: 17 } }}
          >
            SkiSense snapshots operator pricing every night, so you can see what a holiday
            actually costs — and which weeks are getting cheaper.
          </Typography>
        </motion.div>

        <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} sx={{ mt: 4, flexWrap: "wrap", gap: 2 }}>
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, delay: 0.1 + i * 0.06, ease: EASING }}
            >
              <Box
                sx={{
                  px: 2.25,
                  py: 1.25,
                  minWidth: 132,
                  borderRadius: `${RADIUS.lg}px`,
                  bgcolor: `color-mix(in srgb, ${COLORS.surface} 75%, transparent)`,
                  border: "1px solid",
                  borderColor: "divider",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                {isLoading ? (
                  <Skeleton width={72} height={30} />
                ) : (
                  <Typography
                    className="tabular"
                    variant="h5"
                    sx={{ color: item.accent ? COLORS.accent : COLORS.ink }}
                  >
                    {item.value}
                  </Typography>
                )}
              </Box>
            </motion.div>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};
