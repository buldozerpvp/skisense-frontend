"use client";

import { Stack, TextField } from "@mui/material";
import type { MRT_Column, MRT_RowData } from "material-react-table";
import { DATE_FIELD_MIN_WIDTH_PX } from "@/features/offers/filtering/constants";

export type DateRangeValue = [string, string];

export const DateRangeFilter = <TData extends MRT_RowData,>({
  column,
}: {
  column: MRT_Column<TData>;
}) => {
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
        sx={{ minWidth: DATE_FIELD_MIN_WIDTH_PX }}
      />
      <TextField
        type="date"
        size="small"
        label="To"
        value={to}
        onChange={(e) => update([from, e.target.value])}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: DATE_FIELD_MIN_WIDTH_PX }}
      />
    </Stack>
  );
};

export const isWithinDateRange = (value: string, range: DateRangeValue | undefined): boolean => {
  if (!range) return true;
  const [from, to] = range;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
};
