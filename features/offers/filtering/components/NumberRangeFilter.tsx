"use client";

import { Stack, TextField } from "@mui/material";
import type { MRT_Column, MRT_RowData } from "material-react-table";

export type NumberRangeValue = [string, string];

export const NumberRangeFilter = <TData extends MRT_RowData,>({
  column,
  prefix,
}: {
  column: MRT_Column<TData>;
  prefix?: string;
}) => {
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
};

export const isWithinNumberRange = (value: number, range: NumberRangeValue | undefined): boolean => {
  if (!range) return true;
  const [min, max] = range;
  if (min !== "" && value < Number(min)) return false;
  if (max !== "" && value > Number(max)) return false;
  return true;
};
