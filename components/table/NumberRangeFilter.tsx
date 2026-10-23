"use client";

import { Stack, TextField } from "@mui/material";
import type { MRT_Column, MRT_RowData } from "material-react-table";

export type NumberRangeValue = [string, string];

/**
 * Min/max filter for a numeric column.
 *
 * Hand-rolled rather than `filterVariant: "range"` because MRT's version starts
 * with an undefined value and then becomes defined, which flips its inputs from
 * uncontrolled to controlled and makes React warn. Empty strings here keep both
 * inputs controlled for their whole life.
 */
export function NumberRangeFilter<TData extends MRT_RowData>({
  column,
  prefix,
}: {
  column: MRT_Column<TData>;
  prefix?: string;
}) {
  const [min = "", max = ""] = (column.getFilterValue() as NumberRangeValue) ?? ["", ""];

  const update = (next: NumberRangeValue) =>
    column.setFilterValue(next[0] || next[1] ? next : undefined);

  return (
    <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }}>
      <TextField
        type="number"
        size="small"
        label={prefix ? `Min ${prefix}` : "Min"}
        value={min}
        onChange={(e) => update([e.target.value, max])}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 74 }}
      />
      <TextField
        type="number"
        size="small"
        label={prefix ? `Max ${prefix}` : "Max"}
        value={max}
        onChange={(e) => update([min, e.target.value])}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 74 }}
      />
    </Stack>
  );
}

/** Inclusive range test; a blank bound means "no bound". */
export function isWithinNumberRange(value: number, range: NumberRangeValue | undefined): boolean {
  if (!range) return true;
  const [min, max] = range;
  if (min !== "" && value < Number(min)) return false;
  if (max !== "" && value > Number(max)) return false;
  return true;
}
