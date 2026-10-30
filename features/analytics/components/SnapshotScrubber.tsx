"use client";

import { useEffect } from "react";
import { Box, IconButton, Slider, Stack, Typography, Chip } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import { MOTION, useChartColors } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { useSnapshotCursor } from "@/features/analytics/hooks/useSnapshotCursor";
import { shortDate } from "@/shared/format/formatters";
import { COLORS } from "@/shared/design/tokens";
import type { DayISO } from "@/features/analytics/lib/types";

export const SnapshotScrubber = ({ days }: { days: DayISO[] }) => {
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

  if (days.length < 2) return null;

  const start = () => {
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
};
