"use client";

import { Stack, TextField } from "@mui/material";
import type { MRT_Column, MRT_RowData } from "material-react-table";

export type DateRangeValue = [string, string];

/**
 * Departure-date range filter.
 *
 * Uses native date inputs rather than MUI's date pickers: the rows already
 * store dates as ISO `YYYY-MM-DD` strings, so there's nothing to parse or
 * localise, and it avoids pulling in a picker library plus its date adapter.
 */
export function DateRangeFilter<TData extends MRT_RowData>({
  column,
}: {
  column: MRT_Column<TData>;
}) {
  const [from = "", to = ""] = (column.getFilterValue() as DateRangeValue) ?? ["", ""];

  const update = (next: DateRangeValue) =>
    column.setFilterValue(next[0] || next[1] ? next : undefined);

  return (
    <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }}>
      <TextField
        type="date"
        size="small"
        label="From"
        value={from}
        onChange={(e) => update([e.target.value, to])}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 158 }}
      />
      <TextField
        type="date"
        size="small"
        label="To"
        value={to}
        onChange={(e) => update([from, e.target.value])}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 158 }}
      />
    </Stack>
  );
}

/**
 * Inclusive range test. ISO dates compare correctly as plain strings, so no
 * Date objects are constructed per row.
 */
export function isWithinDateRange(value: string, range: DateRangeValue | undefined): boolean {
  if (!range) return true;
  const [from, to] = range;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}
