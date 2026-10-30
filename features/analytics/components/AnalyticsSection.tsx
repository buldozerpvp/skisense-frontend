"use client";

import { useMemo, useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAllOffers } from "@/features/prices/hooks/usePrices";
import { useOffersBrowsing } from "@/features/offers/hooks/useOffersBrowsing";
import { useSnapshotCursor } from "@/features/analytics/hooks/useSnapshotCursor";
import { buildHomeModel, resortLevels, seasonWeeks, topMoves } from "@/features/analytics/lib/homeModel";
import { CheapestResorts } from "@/features/analytics/charts/components/CheapestResorts";
import { ChangeBoard } from "@/features/analytics/charts/components/ChangeBoard";
import { SeasonBand } from "@/features/analytics/charts/components/SeasonBand";
import { SnapshotScrubber } from "@/features/analytics/components/SnapshotScrubber";
import { ALL_RESORTS, CHEAPEST_RESORT_ROWS, MOVERS_PER_SIDE } from "@/features/analytics/constants";

export const AnalyticsSection = () => {
  const { data: history, isFetching } = useAllOffers();

  const selectedBrands = useOffersBrowsing((s) => s.selectedBrands);
  const cursor = useSnapshotCursor((s) => s.index);
  const [resort, setResort] = useState<string>(ALL_RESORTS);

  const scopedHistory = useMemo(() => {
    if (selectedBrands.length === 0) return history;
    return (history ?? []).filter((source) => selectedBrands.includes(source.source));
  }, [history, selectedBrands]);

  const fullModel = useMemo(() => buildHomeModel(scopedHistory), [scopedHistory]);

  const model = useMemo(() => {
    if (cursor === null) return fullModel;
    const day = fullModel.days[cursor];
    return day ? buildHomeModel(scopedHistory, day) : fullModel;
  }, [fullModel, scopedHistory, cursor]);

  const resorts = useMemo(
    () => [...new Set(fullModel.offers.map((offer) => offer.resort))].sort(),
    [fullModel]
  );

  const offers = useMemo(
    () => (resort === ALL_RESORTS ? model.offers : model.offers.filter((o) => o.resort === resort)),
    [model, resort]
  );

  const levels = useMemo(() => resortLevels(offers, CHEAPEST_RESORT_ROWS), [offers]);
  const weeks = useMemo(() => seasonWeeks(offers), [offers]);

  const moves = useMemo(() => {
    const scoped =
      resort === ALL_RESORTS ? model.movers : model.movers.filter((m) => m.resort === resort);
    return topMoves(scoped, MOVERS_PER_SIDE);
  }, [model, resort]);

  const summary = useMemo(() => {
    if (resort === ALL_RESORTS) return model.summary;
    const scoped = model.offers.filter((o) => o.resort === resort);
    const moved = model.movers.filter((m) => m.resort === resort);
    return {
      cheaper: moved.filter((m) => (m.delta as number) < 0).length,
      dearer: moved.filter((m) => (m.delta as number) > 0).length,
      rechecked: scoped.filter((o) => o.prevTotal !== null).length,
      lastCheck: model.summary.lastCheck,
    };
  }, [model, resort]);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <TextField
          select
          size="small"
          label="Resort"
          value={resort}
          onChange={(event) => setResort(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value={ALL_RESORTS}>All resorts</MenuItem>
          {resorts.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ maxWidth: 440, textAlign: { xs: "left", sm: "right" } }}
        >
          {model.offers.length.toLocaleString("en-GB")} bookings on sale · prices are booking
          totals, compared per night
        </Typography>
      </Stack>

      <SnapshotScrubber days={fullModel.days} />

      <CheapestResorts levels={levels} isFetching={isFetching} />

      <ChangeBoard moves={moves} summary={summary} isFetching={isFetching} />

      <SeasonBand weeks={weeks} isFetching={isFetching} />
    </Stack>
  );
};
