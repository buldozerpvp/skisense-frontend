"use client";

import { useEffect, useState } from "react";
import { InputAdornment, TextField } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { COLORS } from "@/shared/design/tokens";
import { useOffersBrowsing } from "@/features/offers/hooks/useOffersBrowsing";
import { SEARCH_SETTLE_MS } from "@/features/offers/constants";

export const TableSearch = () => {
  const setSearchText = useOffersBrowsing((s) => s.setSearchText);
  const [value, setValue] = useState(() => useOffersBrowsing.getState().searchText);

  useEffect(() => {
    const timer = setTimeout(() => setSearchText(value), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [value, setSearchText]);

  return (
    <TextField
      size="small"
      placeholder="Search resort, hotel, country…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      sx={{ width: { xs: 190, sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" sx={{ color: COLORS.inkFaint }} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
