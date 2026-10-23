"use client";

import { Paper, Stack, Typography, Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { motion } from "framer-motion";
import { CHART_COLORS } from "@/lib/charts/palette";
import { eur, eurDelta, offerLabel, pct, trendGlyph } from "@/lib/analytics/format";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { getBrand } from "@/lib/brands/config";
import type { BestPrice, Movement } from "@/lib/analytics/types";

interface KpiStripProps {
  cheapest: BestPrice | null;
  biggestDrop: Movement | null;
  dropCount: number;
  riseCount: number;
  snapshotDays: number;
  /** True when a resort or brand filter is on, so the numbers are scoped. */
  isFiltered: boolean;
}

/** Module-scope formatters — AnimatedNumber needs a stable function identity. */
const asEur = (value: number) => eur(value);
const asEurDelta = (value: number) => eurDelta(value);
const asCount = (value: number) => String(Math.round(value));

export function KpiStrip({
  cheapest,
  biggestDrop,
  dropCount,
  riseCount,
  snapshotDays,
  isFiltered,
}: KpiStripProps) {
  const scope = isFiltered ? " · within your filters" : "";
  const seller = cheapest ? getBrand(cheapest.source)?.name : undefined;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Tile
          index={0}
          label="Cheapest week right now"
          value={cheapest?.priceEur ?? null}
          format={asEur}
          detail={
            cheapest
              ? `${offerLabel(cheapest.resort, cheapest.departure)}${seller ? ` · ${seller}` : ""}${scope}`
              : "Nothing matches these filters"
          }
          accent={CHART_COLORS.drop}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Tile
          index={1}
          label="Biggest price cut"
          value={biggestDrop?.deltaPrev ?? null}
          format={asEurDelta}
          detail={
            biggestDrop && biggestDrop.prev != null
              ? `Was ${eur(biggestDrop.prev)}, now ${eur(biggestDrop.latest)} · ${offerLabel(
                  biggestDrop.resort,
                  biggestDrop.departure
                )}`
              : "We'll know after tonight's price check"
          }
          accent={CHART_COLORS.drop}
          glyph={biggestDrop?.deltaPrev != null ? trendGlyph(biggestDrop.deltaPrev) : undefined}
          suffix={biggestDrop?.pctPrev != null ? pct(biggestDrop.pctPrev) : undefined}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper sx={{ p: 2, height: "100%" }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Changed last night
          </Typography>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <Stack direction="row" spacing={0.75} alignItems="baseline">
              <Box component="span" sx={{ color: CHART_COLORS.drop, fontSize: 13 }}>
                {trendGlyph(-1)}
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: CHART_COLORS.drop }}>
                <AnimatedNumber value={dropCount} format={asCount} duration={0.5} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                got cheaper
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="baseline">
              <Box component="span" sx={{ color: CHART_COLORS.rise, fontSize: 13 }}>
                {trendGlyph(1)}
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: CHART_COLORS.rise }}>
                <AnimatedNumber value={riseCount} format={asCount} duration={0.5} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                went up
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            moves over €25 and 2%
          </Typography>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Tile
          index={3}
          label="Price checks so far"
          value={snapshotDays}
          format={asCount}
          duration={0.5}
          detail={snapshotDays === 1 ? "trends start after tonight" : "we check every night at 02:00"}
          accent={CHART_COLORS.brand}
        />
      </Grid>
    </Grid>
  );
}

function Tile({
  label,
  value,
  format,
  detail,
  accent,
  glyph,
  suffix,
  index,
  duration,
}: {
  label: string;
  value: number | null;
  format: (value: number) => string;
  detail: string;
  accent: string;
  glyph?: string;
  /** Small trailing figure, e.g. the percentage behind a euro change. */
  suffix?: string;
  index: number;
  duration?: number;
}) {
  return (
    // Mount only. Re-fading the card on every data change would be noise on top
    // of the number already counting to its new value.
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
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
          {suffix && (
            <Typography variant="body2" sx={{ color: accent, fontWeight: 600 }}>
              {suffix}
            </Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
      </Paper>
    </motion.div>
  );
}
