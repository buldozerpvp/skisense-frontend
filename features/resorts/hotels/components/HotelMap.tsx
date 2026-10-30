"use client";

import { useState } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { COLORS } from "@/shared/design/tokens";
import type { HotelPlace } from "@/features/resorts/hotels/lib/hotelPlaces";
import { ResortMap } from "@/features/resorts/components/ResortMap";
import { HOTEL_MAP_ENLARGED_ZOOM_APPROXIMATE, HOTEL_MAP_ENLARGED_ZOOM_EXACT, HOTEL_MAP_HEIGHT_PX, HOTEL_MAP_ZOOM_APPROXIMATE, HOTEL_MAP_ZOOM_EXACT } from "@/features/resorts/hotels/constants";

export const HotelMap = ({
  place,
  hotel,
  resort,
  height = HOTEL_MAP_HEIGHT_PX,
}: {
  place: HotelPlace;
  hotel?: string;
  resort: string;
  height?: number;
}) => {
  const [full, setFull] = useState(false);
  const label = place.exact ? hotel ?? resort : resort;

  return (
    <>
      <Box sx={{ position: "relative" }}>
        <Box
          component="button"
          type="button"
          onClick={() => setFull(true)}
          aria-label={`Open the map of ${label} full screen`}
          sx={{
            display: "block",
            width: "100%",
            p: 0,
            border: "none",
            bgcolor: "transparent",
            cursor: "zoom-in",
            "& > div": { borderRadius: 0, border: "none" },
          }}
        >
          <ResortMap
            lat={place.lat}
            lon={place.lon}
            name={label}
            height={height}
            zoom={place.exact ? HOTEL_MAP_ZOOM_EXACT : HOTEL_MAP_ZOOM_APPROXIMATE}
            interactive={false}
          />
        </Box>

        <Stack
          direction="row"
          spacing={0.6}
          alignItems="center"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            minHeight: 28,
            px: 1.1,
            borderRadius: 999,
            bgcolor: "rgba(4,12,20,0.55)",
            color: "#F2F8FC",
            pointerEvents: "none",
          }}
        >
          <OpenInFullRoundedIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Tap to enlarge</Typography>
        </Stack>
      </Box>

      <Typography sx={{ px: 2, pt: 0.8, fontSize: 10.5, color: COLORS.inkFaint, lineHeight: 1.5 }}>
        {place.exact
          ? "No photos of this property yet — this is where it stands."
          : `No photos of this property yet, and no exact address — the pin is the centre of ${resort}.`}
      </Typography>

      <Dialog
        fullScreen
        open={full}
        onClose={() => setFull(false)}
        slotProps={{ paper: { sx: { bgcolor: COLORS.canvas, backgroundImage: "none" } } }}
      >
        <Stack sx={{ height: "100dvh" }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: 1.5, py: 1.2, bgcolor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
          >
            <PlaceRoundedIcon sx={{ fontSize: 18, color: COLORS.brand }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.inkMuted }}>
                {place.exact ? "Exact location" : `Approximate — centre of ${resort}`}
              </Typography>
            </Box>
            <IconButton onClick={() => setFull(false)} aria-label="Close the map" sx={{ color: COLORS.ink }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0, p: 1.5 }}>
            <ResortMap
              lat={place.lat}
              lon={place.lon}
              name={label}
              height="100%"
              zoom={place.exact ? HOTEL_MAP_ENLARGED_ZOOM_EXACT : HOTEL_MAP_ENLARGED_ZOOM_APPROXIMATE}
              interactive
            />
          </Box>
        </Stack>
      </Dialog>
    </>
  );
};
