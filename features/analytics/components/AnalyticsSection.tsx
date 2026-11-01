"use client";

import { useMemo, useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAllOffers } from "@/features/prices/hooks/usePrices";
import { useOffersBrowsing } from "@/features/offers/hooks/useOffersBrowsing";
import { useSnapshotCursor } from "@/features/analytics/hooks/useSnapshotCursor";
import { buildHomeModel, operatorSeasons, resortLevels } from "@/features/analytics/lib/homeModel";
import { CheapestResorts } from "@/features/analytics/charts/components/CheapestResorts";
import { OperatorSeasonLines } from "@/features/analytics/charts/components/OperatorSeasonLines";
import { SnapshotScrubber } from "@/features/analytics/components/SnapshotScrubber";
import { ALL_RESORTS, CHEAPEST_RESORT_ROWS } from "@/features/analytics/constants";

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
  const seasons = useMemo(() => operatorSeasons(offers), [offers]);
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

      <OperatorSeasonLines seasons={seasons} isFetching={isFetching} />
    </Stack>
  );
};
