"use client";

import { useMemo } from "react";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { motion } from "framer-motion";
import { useAllOffers, useLatestOffers } from "@/features/prices/hooks/usePrices";
import {
  brandHasData,
  brandHeadline,
  brandLatestRows,
  brandSeriesIndex,
  resortSpreads,
} from "@/features/analytics/lib/brandModel";
import { eur, offerLabel, pct, shortDate, trendGlyph } from "@/shared/format/formatters";
import { useChartColors, changeColor } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { getBrand } from "@/features/brands/constants";
import { paxOf, totalPrice } from "@/features/offers/lib/pricing";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { AnimatedNumber } from "@/shared/charts/components/AnimatedNumber";
import { BrandResortSpread } from "@/features/analytics/charts/components/BrandResortSpread";
import { ChangeBoard } from "@/features/analytics/charts/components/ChangeBoard";
import { SeasonBand } from "@/features/analytics/charts/components/SeasonBand";
import { buildHomeModel, seasonWeeks, topMoves } from "@/features/analytics/lib/homeModel";

const asEur = (value: number) => eur(value);
const asCount = (value: number) => String(Math.round(value));
const asPct = (value: number) => pct(value, 1);

export interface BrandAnalyticsProps {
  slug: string;
  showHeading?: boolean;
}

export const BrandAnalytics = ({ slug, showHeading = true }: BrandAnalyticsProps) => {
  const colors = useChartColors();
  const { data: latest, isFetching: fetchingLatest } = useLatestOffers();
  const { data: history, isFetching: fetchingHistory } = useAllOffers();
  const isFetching = fetchingLatest || fetchingHistory;

  const brand = getBrand(slug);
  const operator = brand?.name ?? slug;

  const rows = useMemo(() => brandLatestRows(latest, slug), [latest, slug]);
  const index = useMemo(() => brandSeriesIndex(history, slug), [history, slug]);
  const spreads = useMemo(() => resortSpreads(rows, slug), [rows, slug]);
  const headline = useMemo(() => brandHeadline(rows, index, slug), [rows, index, slug]);

  const model = useMemo(
    () => buildHomeModel((history ?? []).filter((s) => s.source === slug)),
    [history, slug]
  );
  const moves = useMemo(() => topMoves(model.movers, 5), [model.movers]);
  const weeks = useMemo(() => seasonWeeks(model.offers), [model.offers]);

  if (!brandHasData(rows, index)) return null;

  const hasHistory = headline.snapshotDays > 1;
  const snapshotDay = index.latestDay;

  return (
    <Box component="section">
      {showHeading && (
        <SectionHeading
          icon={<InsightsRoundedIcon fontSize="small" />}
          title={`${operator} in numbers`}
          subtitle={`What this operator costs, where it sells, and how its prices have moved${
            snapshotDay ? ` · last checked ${shortDate(snapshotDay)}` : ""
          }.`}
        />
      )}

      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Tile
              index={0}
              label="Cheapest booking right now"
              value={headline.cheapest ? totalPrice(headline.cheapest) : null}
              format={asEur}
              accent={colors.drop}
              detail={
                headline.cheapest
                  ? `${offerLabel(headline.cheapest.resort, headline.cheapest.date)} · total for ${paxOf(
                      headline.cheapest
                    )}${headline.cheapestPerNight ? ` · ${eur(headline.cheapestPerNight)}/person/night` : ""}`
                  : `No ${operator} departures on sale`
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Tile
              index={1}
              label="Typical price per night"
              value={headline.medianPerNight}
              format={asEur}
              accent={colors.brand}
              detail={
                headline.medianPerNight !== null
                  ? `Median of ${headline.comparableCount} departures, per person per night`
                  : "No stay lengths we can compare yet"
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Tile
              index={2}
              label="Resorts covered"
              value={headline.resortCount}
              format={asCount}
              duration={0.5}
              accent={brand?.color ?? colors.brand}
              detail={`${headline.departureCount} priced departures across ${headline.countryCount} ${
                headline.countryCount === 1 ? "country" : "countries"
              }`}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Tile
              index={3}
              label="Since the last check"
              value={headline.lastNightPct}
              format={asPct}
              accent={changeColor(headline.lastNightPct, colors)}
              glyph={headline.lastNightPct != null ? trendGlyph(headline.lastNightPct) : undefined}
              detail={
                headline.lastNightPct != null
                  ? `${headline.dropCount} cheaper, ${headline.riseCount} pricier · weeks on sale both nights`
                  : "Trends start after tonight's check"
              }
            />
          </Grid>
        </Grid>

        <BrandResortSpread
          spreads={spreads}
          slug={slug}
          isFetching={isFetching}
          snapshotDay={snapshotDay}
        />

        {hasHistory ? (
          <>
            <ChangeBoard moves={moves} summary={model.summary} isFetching={isFetching} />
            {weeks.length > 1 && <SeasonBand weeks={weeks} isFetching={isFetching} />}
          </>
        ) : (
          <Alert severity="info" variant="outlined" icon={false} sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              We&apos;ve checked {operator} once so far
              {snapshotDay ? `, on ${shortDate(snapshotDay)}` : ""}. The prices above are today&apos;s
              levels — trends start after tonight&apos;s check.
            </Typography>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

const Tile = ({
  label,
  value,
  format,
  detail,
  accent,
  glyph,
  index,
  duration,
}: {
  label: string;
  value: number | null;
  format: (value: number) => string;
  detail: string;
  accent: string;
  glyph?: string;
  index: number;
  duration?: number;
}) => {
  const { stagger, reduced } = useChartMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.35, delay: stagger(index), ease: "easeOut" }}
      style={{ height: "100%" }}
    >
      <Paper sx={{ p: 2, height: "100%" }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="baseline">
          {glyph && (
            <Box component="span" sx={{ color: accent, fontSize: 14 }}>
              {glyph}
            </Box>
          )}
          <Typography variant="h4" fontWeight={700} sx={{ color: accent, position: "relative" }}>
            <AnimatedNumber value={value} format={format} duration={duration} />
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
      </Paper>
    </motion.div>
  );
};
