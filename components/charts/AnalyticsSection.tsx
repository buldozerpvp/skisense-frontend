"use client";

import { useMemo, useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAllOffers } from "@/lib/query/usePrices";
import { useAppStore } from "@/lib/store/useAppStore";
import { useSnapshotCursor } from "@/lib/store/useSnapshotCursor";
import { buildHomeModel, resortLevels, seasonWeeks, topMoves } from "@/lib/analytics/home";
import { CheapestResorts } from "./CheapestResorts";
import { ChangeBoard } from "./ChangeBoard";
import { SeasonBand } from "./SeasonBand";
import { SnapshotScrubber } from "./SnapshotScrubber";

const ALL_RESORTS = "__all__";
/** Enough resorts to show a market, few enough that every row stays labelled. */
const RESORT_ROWS = 12;
/** Six each way. Twelve rows is the most a reader scans without losing the zero line. */
const MOVES_PER_SIDE = 6;

/**
 * The analytics view: three cards, three questions.
 *
 * 1. Where is a ski week cheapest right now — the levels.
 * 2. What changed since the last price check — the movement.
 * 3. When in the season to go — the timing.
 *
 * It used to be nine cards. The price journey, the rank ladder and two
 * dumbbells all answered question 2 in different dialects, and a reader who
 * couldn't tell them apart learned nothing from any of them. Each question now
 * gets exactly one chart, and anything that needed a paragraph of explanation
 * is gone.
 *
 * Everything is derived from one fold of the stored history (`buildHomeModel`),
 * so no two cards can disagree about what's on sale or how many prices moved.
 * One filter row and one snapshot cursor scope all three together.
 */
export function AnalyticsSection() {
  const { data: history, isFetching } = useAllOffers();

  const selectedBrands = useAppStore((s) => s.selectedBrands);
  const cursor = useSnapshotCursor((s) => s.index);
  const [resort, setResort] = useState<string>(ALL_RESORTS);

  const scopedHistory = useMemo(() => {
    if (selectedBrands.length === 0) return history;
    return (history ?? []).filter((source) => selectedBrands.includes(source.source));
  }, [history, selectedBrands]);

  const fullModel = useMemo(() => buildHomeModel(scopedHistory), [scopedHistory]);

  // Rebuilt at the cursor's day so all three cards rewind together; pressing
  // play walks the whole section through the history at once.
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

  const levels = useMemo(() => resortLevels(offers, RESORT_ROWS), [offers]);
  const weeks = useMemo(() => seasonWeeks(offers), [offers]);

  const moves = useMemo(() => {
    const scoped =
      resort === ALL_RESORTS ? model.movers : model.movers.filter((m) => m.resort === resort);
    return topMoves(scoped, MOVES_PER_SIDE);
  }, [model, resort]);

  // The headline counts must describe the same rows the board draws, or the
  // card contradicts itself the moment a resort is selected.
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
}
