"use client";

import { Badge, Box, IconButton, InputBase, Stack, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { COLORS } from "@/lib/design/tokens";
import { TAP } from "./MobileShell";

/**
 * The only two controls on a list screen, on one pinned line.
 *
 * The Filters button changes appearance rather than hiding: outlined when
 * nothing is applied, filled with a count when something is, so the state is
 * readable before you read the chips.
 */
export function SearchBar({
  value,
  onChange,
  onOpenFilters,
  activeCount,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onOpenFilters: () => void;
  activeCount: number;
  placeholder: string;
}) {
  const on = activeCount > 0;
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flex: "0 0 auto", px: 2, py: 1.25, borderBottom: `1px solid ${COLORS.border}` }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 40,
          px: 1.5,
          borderRadius: 999,
          border: `1px solid ${value ? COLORS.brand : COLORS.border}`,
          bgcolor: COLORS.surface,
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 17, color: COLORS.inkFaint }} />
        <InputBase
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputProps={{ "aria-label": placeholder, enterKeyHint: "search" }}
          sx={{ flex: 1, fontSize: 13.5, color: COLORS.ink }}
        />
        {value && (
          <IconButton
            size="small"
            aria-label="Clear the search"
            onClick={() => onChange("")}
            sx={{ color: COLORS.inkMuted }}
          >
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Stack>

      <Box
        component="button"
        type="button"
        onClick={onOpenFilters}
        aria-label={on ? `Filters, ${activeCount} applied` : "Filters"}
        sx={{
          flexShrink: 0,
          minHeight: 40,
          px: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          borderRadius: 999,
          border: on ? "none" : `1px solid ${COLORS.borderStrong}`,
          bgcolor: on ? COLORS.brand : "transparent",
          color: on ? COLORS.canvas : COLORS.ink,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        <TuneRoundedIcon sx={{ fontSize: 17 }} />
        {on ? (
          <Badge
            badgeContent={activeCount}
            sx={{
              "& .MuiBadge-badge": {
                position: "static",
                transform: "none",
                bgcolor: COLORS.canvas,
                color: COLORS.brand,
                fontWeight: 700,
              },
            }}
          />
        ) : (
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Filters</Typography>
        )}
      </Box>
    </Stack>
  );
}

/** One active filter, droppable without reopening the sheet. */
export function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClear}
      aria-label={`Remove filter: ${label}`}
      sx={{
        flexShrink: 0,
        minHeight: 32,
        px: 1.4,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        borderRadius: 999,
        border: "none",
        bgcolor: COLORS.frost,
        color: COLORS.ink,
        fontSize: 12,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "inherit" }}>{label}</Typography>
      <CloseRoundedIcon sx={{ fontSize: 14, color: COLORS.inkMuted }} />
    </Box>
  );
}

/** Horizontally scrolling chip row; empty renders nothing at all. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={0.9}
      sx={{
        flex: "0 0 auto",
        px: 2,
        py: 1.1,
        overflowX: "auto",
        borderBottom: `1px solid ${COLORS.border}`,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {children}
    </Stack>
  );
}

/** The line above the list: what it is sorted by, and how much is showing. */
export function CountBar({ left, right }: { left: string; right: string }) {
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      justifyContent="space-between"
      sx={{ flex: "0 0 auto", px: 2, py: 1.1, borderBottom: `1px solid ${COLORS.border}` }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.inkMuted }}>
        {left}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: COLORS.inkFaint, fontVariantNumeric: "tabular-nums" }}>
        {right}
      </Typography>
    </Stack>
  );
}

export { TAP };
