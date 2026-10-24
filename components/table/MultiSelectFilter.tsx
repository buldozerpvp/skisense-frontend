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
import { matchesQuery } from "@/lib/table/search";

/**
 * Keystrokes are kept from the menu so typing in the search box doesn't
 * trigger its jump-to-letter behaviour — but Escape and Tab must still get
 * through, or the dropdown can't be closed from the keyboard once focus is
 * inside the header.
 */
function swallowTypeAhead(event: { key: string; stopPropagation: () => void }) {
  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
}

export interface MultiSelectOption {
  label: string;
  value: string;
}

/**
 * A column filter that starts from "everything" and lets you take things away.
 *
 * Material React Table's own multi-select makes you tick each value you want,
 * which is the wrong way round here: with six brands or sixty hotels, you
 * normally want all of them bar one. So this adds **All** and **None**
 * buttons, a type-ahead box once the list gets long, and a summary that says
 * what's excluded rather than listing what's kept.
 *
 * The filter value means exactly one of three things, and nothing in between:
 * `undefined` is "no filter, everything shows", an array is the values kept,
 * and an **empty array is "none"** — a real filter that matches no row. The
 * first version used an empty array for "no filter" and a sentinel string for
 * "none", which is why All and None both reported "1 selected" now and then.
 */
export function MultiSelectFilter<T extends MRT_RowData>({
  column,
  options,
  searchThreshold = 8,
}: {
  column: MRT_Column<T>;
  options: MultiSelectOption[];
  /** Show the type-ahead box once there are more options than this. */
  searchThreshold?: number;
}) {
  const raw = column.getFilterValue() as string[] | undefined;
  // No filter means every value is in play, so every box is ticked. Unticking
  // one then starts from the full list rather than from nothing.
  const selected = raw ?? options.map((o) => o.value);
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    // Same matcher as the table's search box, so "magic pass" finds
    // "Hotel Magic Pas" here too.
    const query = search.trim();
    if (!query) return options;
    return options.filter((o) => matchesQuery(query, o.label));
  }, [options, search]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const next = event.target.value as string[];
    // Everything ticked is stored as "no filter", which keeps saved views tidy
    // and the table fast. An empty tick-list is kept as an empty array: that
    // is "none", which is a filter, not the absence of one.
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
      {/* ListSubheader, not a plain Box: MUI's Select clones every child and
          attaches its own click handler, so a bare wrapper had each button
          *also* register as picking an option with no value — which is how
          All and None used to leave the filter reading "1 selected".
          ListSubheader is the one child type Select leaves alone. */}
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
}

/**
 * Shared filter function.
 *
 * No value means no filter. A list — including an empty one, which is how
 * "None" is stored — keeps only the values it names.
 */
export function isOneOf(value: string | undefined, selected: unknown): boolean {
  if (selected === undefined || selected === null) return true;
  const list = selected as string[];
  if (!Array.isArray(list)) return true;
  return value !== undefined && list.includes(value);
}
