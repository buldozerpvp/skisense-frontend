"use client";

import { useState } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/lib/design/tokens";
import { countryBadge } from "@/lib/table/countries";
import { buildPhotoUrl, photoSourceUrl, resortInfo } from "@/lib/resorts/resort-info";
import { useResortCard } from "@/lib/resorts/useResortCard";
import { ResortMap } from "./ResortMap";

/**
 * The card behind every resort name.
 *
 * Photo, where it is, and the three numbers that decide whether a resort is
 * worth the price: how much piste, how much snow, how high. Everything is
 * optional — a resort with no photo still gets a usable card rather than a
 * broken one.
 */
export function ResortCard() {
  const openKey = useResortCard((s) => s.openKey);
  const fallbackName = useResortCard((s) => s.fallbackName);
  const close = useResortCard((s) => s.close);
  const [big, setBig] = useState(false);

  const info = resortInfo(openKey ?? undefined);
  const open = openKey !== null;
  const name = info?.name ?? fallbackName ?? "";
  const badge = info ? countryBadge(info.country) : null;
  const stats = info?.stats;

  const handleClose = () => {
    setBig(false);
    close();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: COLORS.surface,
            backgroundImage: "none",
            borderRadius: `${RADIUS.xl}px`,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
            m: { xs: 1.5, sm: 3 },
            width: { xs: "calc(100% - 24px)", sm: "100%" },
          },
        },
      }}
    >
      {open && (
        <>
          <Box sx={{ position: "relative" }}>
            {info?.photo ? (
              <Box
                component="img"
                src={buildPhotoUrl(info.photo, 1200)}
                alt={`${name} in winter`}
                sx={{ width: "100%", height: { xs: 170, sm: 215 }, objectFit: "cover", display: "block", bgcolor: COLORS.frost }}
              />
            ) : (
              <Box sx={{ height: { xs: 120, sm: 150 }, bgcolor: COLORS.frost }} />
            )}

            {/* The name sits on the photo, over a gradient rather than a flat
                scrim, so a bright sky and a dark forest both stay readable. */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(4,12,20,0.88) 0%, rgba(4,12,20,0.35) 42%, rgba(4,12,20,0.08) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                p: 2,
              }}
            >
              <Typography
                sx={{ fontFamily: FONT_DISPLAY, fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: "#F2F8FC", lineHeight: 1.15 }}
              >
                {name}
              </Typography>
              {badge && (
                <Typography sx={{ mt: 0.3, fontSize: 13, color: "rgba(242,248,252,0.86)" }}>
                  {badge.flag} {badge.name}
                  {stats?.linkedArea ? ` · ${stats.linkedArea}` : ""}
                </Typography>
              )}
            </Box>

            <IconButton
              onClick={handleClose}
              aria-label="Close"
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 34,
                height: 34,
                color: "#F2F8FC",
                bgcolor: "rgba(4,12,20,0.45)",
                "&:hover": { bgcolor: "rgba(4,12,20,0.7)" },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ p: 2 }}>
            {info?.blurb && (
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, color: COLORS.inkMuted }}>{info.blurb}</Typography>
            )}

            {stats && (
              <Stack direction="row" spacing={1} sx={{ mt: info?.blurb ? 1.75 : 0 }}>
                <Stat label="Slopes" value={stats.pisteKm} unit="km" />
                <Stat label="Snow a season" value={stats.snowfallCm} unit="cm" />
                <Stat label="Top lift" value={stats.topM} unit="m" />
              </Stack>
            )}

            {stats?.snowfallCm !== undefined && (
              <Typography sx={{ mt: 0.9, fontSize: 10.5, color: COLORS.inkFaint, lineHeight: 1.5 }}>
                Snowfall is a typical season&apos;s total from resort-filed reports — compare it between
                Alpine resorts, not across regions.
              </Typography>
            )}

            {(stats?.lifts || stats?.baseM) && (
              <Typography sx={{ mt: 1.1, fontSize: 11.5, color: COLORS.inkFaint }}>
                {[
                  stats?.lifts ? `${stats.lifts} lifts` : null,
                  stats?.baseM && stats?.topM ? `${stats.baseM.toLocaleString("en-GB")}–${stats.topM.toLocaleString("en-GB")} m` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            )}

            {info?.lat !== undefined && info?.lon !== undefined && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.9 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: COLORS.inkMuted }}>
                    Where it is
                  </Typography>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setBig((v) => !v)}
                    sx={{
                      minHeight: 32,
                      px: 1.2,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      borderRadius: 999,
                      border: `1px solid ${COLORS.borderStrong}`,
                      bgcolor: "transparent",
                      color: COLORS.ink,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {big ? <CloseFullscreenRoundedIcon sx={{ fontSize: 14 }} /> : <OpenInFullRoundedIcon sx={{ fontSize: 14 }} />}
                    {big ? "Shrink" : "Enlarge"}
                  </Box>
                </Stack>
                <ResortMap
                  lat={info.lat}
                  lon={info.lon}
                  name={name}
                  height={big ? 360 : 170}
                  zoom={big ? 11 : 9}
                  interactive={big}
                />
                {!big && (
                  <Typography sx={{ mt: 0.7, fontSize: 11, color: COLORS.inkFaint }}>
                    Enlarge to pan and zoom.
                  </Typography>
                )}
              </Box>
            )}

            {/* The credit is the licence condition, not a nicety. */}
            {info?.photo && (
              <Typography sx={{ mt: 1.75, fontSize: 10.5, color: COLORS.inkFaint, lineHeight: 1.5 }}>
                Photo{info.photo.author && info.photo.author !== "Unknown" ? `: ${info.photo.author}` : ""} ·{" "}
                <Box
                  component="a"
                  href={photoSourceUrl(info.photo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: COLORS.brand, textDecoration: "none" }}
                >
                  {info.photo.licence}
                </Box>{" "}
                via Wikimedia Commons
              </Typography>
            )}

            {!info && (
              <Typography sx={{ fontSize: 13, color: COLORS.inkMuted }}>
                We don&apos;t have details for this resort yet.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Dialog>
  );
}

/** One figure. A missing value renders a dash, never a zero. */
function Stat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 1.2, bgcolor: COLORS.canvas, border: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.md}px` }}>
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.inkMuted }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: COLORS.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {value === undefined ? "—" : value.toLocaleString("en-GB")}
        {value !== undefined && <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: COLORS.inkMuted, ml: 0.4 }}>{unit}</Box>}
      </Typography>
    </Box>
  );
}
