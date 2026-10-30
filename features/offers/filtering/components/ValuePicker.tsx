"use client";

import { useMemo, useState } from "react";
import { Box, Dialog, IconButton, InputBase, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { COLORS, RADIUS } from "@/shared/design/tokens";
import { matchesQuery } from "@/features/offers/lib/offerSearch";
import type { PickerOption } from "@/features/offers/lib/offerModel";
import { TAP } from "@/features/app-shell/components/MobileShell";

export const ValuePicker = ({
  open,
  title,
  subtitle,
  options,
  selected,
  onChange,
  onClose,
  resultCount,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  options: PickerOption[];
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
  onClose: () => void;
  resultCount: number;
}) => {
  const [query, setQuery] = useState("");

  const shown = useMemo(
    () => (query ? options.filter((option) => matchesQuery(query, option.label)) : options),
    [options, query]
  );

  const isOn = (value: string) => selected === null || selected.includes(value);

  const toggle = (value: string) => {
    const base = selected ?? options.map((option) => option.value);
    const next = base.includes(value) ? base.filter((v) => v !== value) : [...base, value];
    onChange(next.length === options.length ? null : next);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: COLORS.canvas, backgroundImage: "none" } } }}
    >
      <Stack sx={{ height: "100dvh" }}>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ px: 1.25, py: 1.1, bgcolor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <IconButton onClick={onClose} aria-label="Back to filters" sx={{ color: COLORS.ink }}>
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink }}>{title}</Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.inkMuted }}>{subtitle}</Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mx: 2, my: 1.25, px: 1.5, minHeight: 40, borderRadius: 999, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surface }}
        >
          <SearchRoundedIcon sx={{ fontSize: 17, color: COLORS.inkFaint }} />
          <InputBase
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to narrow the list"
            inputProps={{ "aria-label": `Search ${title.toLowerCase()}` }}
            sx={{ flex: 1, fontSize: 16, color: COLORS.ink }}
          />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1, bgcolor: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.inkMuted }}>
            {shown.length} shown
          </Typography>
          <Stack direction="row" spacing={2}>
            <HeaderButton label="Select all" onClick={() => onChange(null)} />
            <HeaderButton label="None" onClick={() => onChange([])} />
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {shown.map((option, index) => (
            <Box
              key={option.value}
              component="button"
              type="button"
              role="checkbox"
              aria-checked={isOn(option.value)}
              onClick={() => toggle(option.value)}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1.4,
                minHeight: TAP + 4,
                px: 2,
                py: 1.1,
                textAlign: "left",
                border: "none",
                borderBottom: `1px solid ${COLORS.border}`,
                bgcolor: index % 2 ? COLORS.surface : "transparent",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  width: 21,
                  height: 21,
                  borderRadius: `${RADIUS.sm}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: isOn(option.value) ? COLORS.brand : "transparent",
                  border: isOn(option.value) ? "none" : `1.5px solid ${COLORS.borderStrong}`,
                  color: COLORS.canvas,
                }}
              >
                {isOn(option.value) && <CheckRoundedIcon sx={{ fontSize: 15 }} />}
              </Box>
              <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
                {option.label}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.inkFaint, fontVariantNumeric: "tabular-nums" }}>
                {option.count.toLocaleString("en-GB")}
              </Typography>
            </Box>
          ))}
          {shown.length === 0 && (
            <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center" }}>
              Nothing matches “{query}”.
            </Typography>
          )}
        </Box>

        <Box sx={{ px: 2, pt: 1.25, pb: "calc(18px + env(safe-area-inset-bottom))", borderTop: `1px solid ${COLORS.border}`, bgcolor: COLORS.canvas }}>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{
              width: "100%",
              minHeight: 48,
              borderRadius: `${RADIUS.pill}px`,
              border: "none",
              bgcolor: COLORS.brand,
              color: COLORS.canvas,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Done · {resultCount.toLocaleString("en-GB")} offers
          </Box>
        </Box>
      </Stack>
    </Dialog>
  );
};

const HeaderButton = ({ label, onClick }: { label: string; onClick: () => void }) => {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        minHeight: 32,
        border: "none",
        bgcolor: "transparent",
        color: COLORS.brand,
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        p: 0,
      }}
    >
      {label}
    </Box>
  );
};
