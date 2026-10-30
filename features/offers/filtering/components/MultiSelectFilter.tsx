"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import type { MRT_Column, MRT_RowData } from "material-react-table";
import { matchesQuery } from "@/features/offers/lib/offerSearch";
import { OPTIONS_BEFORE_A_SEARCH_BOX_HELPS } from "@/features/offers/filtering/constants";

const swallowTypeAhead = (event: { key: string; stopPropagation: () => void }) => {
  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
};

export interface MultiSelectOption {
  label: string;
  value: string;
}

export const MultiSelectFilter = <T extends MRT_RowData,>({
  column,
  options,
  searchThreshold = OPTIONS_BEFORE_A_SEARCH_BOX_HELPS,
}: {
  column: MRT_Column<T>;
  options: MultiSelectOption[];
  searchThreshold?: number;
}) => {
  const raw = column.getFilterValue() as string[] | undefined;
  const selected = raw ?? options.map((o) => o.value);
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim();
    if (!query) return options;
    return options.filter((o) => matchesQuery(query, o.label));
  }, [options, search]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const next = event.target.value as string[];
    column.setFilterValue(next.length === options.length ? undefined : next);
  };

  const summary =
    selected.length === options.length
      ? "All"
      : selected.length === 0
        ? "None"
        : selected.length === 1
          ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
          : `${selected.length} of ${options.length}`;

  return (
    <Select
      multiple
      displayEmpty
      size="small"
      variant="standard"
      value={selected}
      onChange={handleChange}
      renderValue={() => (
        <Typography variant="body2" color={selected.length ? "text.primary" : "text.secondary"} noWrap>
          {summary}
        </Typography>
      )}
      MenuProps={{ PaperProps: { sx: { maxHeight: 360 } }, autoFocus: false }}
      sx={{ width: "100%", fontSize: 13 }}
    >
      <ListSubheader
        sx={{ display: "flex", gap: 1, px: 1.5, py: 1, lineHeight: 1 }}
        onKeyDown={swallowTypeAhead}
      >
        <Button
          size="small"
          variant={selected.length === options.length ? "contained" : "outlined"}
          sx={{ flex: 1, py: 0.1 }}
          data-testid="filter-all"
          onClick={() => column.setFilterValue(undefined)}
        >
          All
        </Button>
        <Button
          size="small"
          variant={selected.length === 0 ? "contained" : "outlined"}
          sx={{ flex: 1, py: 0.1 }}
          data-testid="filter-none"
          onClick={() => column.setFilterValue([])}
        >
          None
        </Button>
      </ListSubheader>

      {options.length > searchThreshold && (
        <ListSubheader sx={{ px: 1.5, pb: 1, lineHeight: 1 }} onKeyDown={swallowTypeAhead}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </ListSubheader>
      )}

      <Divider />

      {visible.map((option) => (
        <MenuItem key={option.value} value={option.value} dense>
          <Checkbox size="small" checked={selected.includes(option.value)} sx={{ py: 0.25 }} />
          <ListItemText primary={option.label} primaryTypographyProps={{ fontSize: 13 }} />
        </MenuItem>
      ))}

      {visible.length === 0 && (
        <MenuItem disabled dense>
          <ListItemText primary="No matches" primaryTypographyProps={{ fontSize: 13 }} />
        </MenuItem>
      )}
    </Select>
  );
};

export const isOneOf = (value: string | undefined, selected: unknown): boolean => {
  if (selected === undefined || selected === null) return true;
  const list = selected as string[];
  if (!Array.isArray(list)) return true;
  return value !== undefined && list.includes(value);
};
