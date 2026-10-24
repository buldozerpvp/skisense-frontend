"use client";

import { useEffect } from "react";
import { Box, IconButton, Slider, Stack, Typography, Chip } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import { MOTION, useChartColors } from "@/lib/charts/palette";
import { useChartMotion } from "@/lib/charts/useChartMotion";
import { useSnapshotCursor } from "@/lib/store/useSnapshotCursor";
import { shortDate } from "@/lib/analytics/format";
import { COLORS } from "@/lib/design/tokens";
import type { DayISO } from "@/lib/analytics/types";

/**
 * Plays the price history back one night at a time. Every chart below reads the
 * same cursor, so pressing play walks the whole section through time together.
 *
 * Steps between discrete snapshot days rather than interpolating a continuous
 * timeline: prices between two nightly checks were never observed, and a smooth
 * slide would draw numbers nobody scraped.
 */
export function SnapshotScrubber({ days }: { days: DayISO[] }) {
  const colors = useChartColors();
  const { reduced } = useChartMotion();
  const { index, playing, setIndex, setPlaying, advance } = useSnapshotCursor();
  const lastIndex = days.length - 1;
  const current = index ?? lastIndex;

  useEffect(() => {
    if (!playing || days.length < 2) return;
    const timer = setTimeout(() => {
      const next = current + 1;
      if (next > lastIndex) {
        setPlaying(false);
        advance(null);
      } else {
        advance(next);
      }
    }, MOTION.scrubStep * 1000);
    return () => clearTimeout(timer);
  }, [playing, current, lastIndex, days.length, advance, setPlaying]);

  // One snapshot is a still photograph; there is nothing to play.
  if (days.length < 2) return null;

  const start = () => {
    // Replays from the second night, not the first: on night one nothing has
    // moved yet, so every "what changed" card would open empty.
    if (index === null || index >= lastIndex) advance(Math.min(1, lastIndex));
    setPlaying(true);
  };

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{
        px: 2,
        py: 1,
        borderRadius: 999,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: COLORS.frost,
      }}
    >
      {!reduced && (
        <IconButton
          size="small"
          onClick={() => (playing ? setPlaying(false) : start())}
          aria-label={playing ? "Pause playback" : "Play price history"}
          sx={{ bgcolor: colors.surface, border: "1px solid", borderColor: "divider" }}
        >
          {playing ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
        </IconButton>
      )}

      <Box sx={{ flex: 1, minWidth: 140 }}>
        <Slider
          size="small"
          min={0}
          max={lastIndex}
          step={1}
          value={current}
          marks
          onChange={(_, value) => setIndex(value === lastIndex ? null : (value as number))}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => shortDate(days[value] ?? "")}
          aria-label="Snapshot day"
        />
      </Box>

      <Chip
        size="small"
        label={index === null ? `Latest · ${shortDate(days[lastIndex])}` : shortDate(days[current])}
        color={index === null ? "default" : "primary"}
        variant={index === null ? "outlined" : "filled"}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
        {days.length} price checks
      </Typography>
    </Stack>
  );
}
