"use client";

import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { COLORS } from "@/shared/design/tokens";

const TODAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const TodayStamp = () => {
  const [today, setToday] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setToday(TODAY.format(new Date()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Typography
      component="p"
      variant="overline"
      suppressHydrationWarning
      sx={{ color: COLORS.inkFaint, textAlign: "right", whiteSpace: "nowrap" }}
    >
      {today ?? ""}
    </Typography>
  );
};
