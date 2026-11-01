"use client";

import { Badge, Button } from "@mui/material";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import { useFilterRow } from "@/features/offers/hooks/useFilterRow";

export const FiltersToggle = ({ count }: { count: number }) => {
  const open = useFilterRow((state) => state.open);
  const toggle = useFilterRow((state) => state.toggle);

  return (
    <Badge badgeContent={count} color="primary" overlap="rectangular">
      <Button
        size="small"
        variant={open ? "contained" : "outlined"}
        startIcon={<FilterListRoundedIcon fontSize="small" />}
        onClick={toggle}
        aria-pressed={open}
        sx={{ borderRadius: 999 }}
      >
        Filters
      </Button>
    </Badge>
  );
};
