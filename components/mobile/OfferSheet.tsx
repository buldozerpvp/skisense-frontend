"use client";

import { useMemo } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";
import { buildSeriesIndex, offerKey } from "@/lib/analytics/derive";
import { useAllOffers } from "@/lib/query/usePrices";
import { PROPERTY_TYPE_ICON, PROPERTY_TYPE_LABEL } from "@/lib/table/hotels";
import { shortDeparture, type MobileOffer } from "@/lib/mobile/model";
import { changeColor, changeLabel } from "./OfferRow";

/**
 * One offer, full screen.
 *
 * This is where the phone beats the table rather than apologising to it: a
 * row can show a price, but it cannot show the same hotel at three operators
 * or six nights of history, and those are the two things that decide a booking.
 */
export function OfferSheet({
  offer,
  siblings,
  onClose,
  onPick,
}: {
  offer: MobileOffer | null;
  siblings: MobileOffer[];
  onClose: () => void;
  onPick: (offer: MobileOffer) => void;
}) {
  const history = useAllOffers();

  // The offer's own observations, which is not the same as "the last six
  // nights": a gap in collection must not be drawn as a flat line.
  const points = useMemo(() => {
    if (!offer || !history.data) return [];
    const index = buildSeriesIndex(history.data);
    const series = index.byKey.get(offerKey(offer.source, offer.resortId, offer.departure, offer.nights));
    return (series?.points ?? []).map((point) => ({ day: point.day, total: Math.round(point.priceEur * offer.pax) }));
  }, [offer, history.data]);

  // Same property, same departure, a different operator — the comparison the
  // whole site exists to make.
  const others = useMemo(() => {
    if (!offer) return [];
    return siblings
      .filter(
        (other) =>
          other.key !== offer.key &&
          other.hotelKey === offer.hotelKey &&
          other.hotelKey !== "" &&
          other.departure === offer.departure
      )
      .sort((a, b) => a.total - b.total)
      .slice(0, 4);
  }, [offer, siblings]);

  if (!offer) return null;

  const low = points.length ? Math.min(...points.map((point) => point.total)) : offer.total;
  const peak = points.length ? Math.max(...points.map((point) => point.total)) : offer.total;

  return (
    <Dialog
      fullScreen
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: COLORS.canvas, backgroundImage: "none" } } }}
    >
      <Stack sx={{ height: "100dvh" }}>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ px: 1.25, py: 1.1, bgcolor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <IconButton onClick={onClose} aria-label="Back to the list" sx={{ color: COLORS.ink }}>
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
            {offer.resort} {offer.flag}
          </Typography>
        </Stack>

        <Box sx={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", pb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.inkMuted }}>
              {offer.hotel ?? "Unnamed property"} · {PROPERTY_TYPE_ICON[offer.propertyType]}{" "}
              {PROPERTY_TYPE_LABEL[offer.propertyType]}
            </Typography>
            <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ mt: 0.6 }}>
              <Typography
                sx={{ fontFamily: FONT_DISPLAY, fontSize: 33, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
              >
                €{offer.total.toLocaleString("en-GB")}
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.inkMuted }}>total for {offer.pax}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 13, color: COLORS.inkMuted }}>
                €{offer.perPerson.toLocaleString("en-GB")} each
              </Typography>
              {offer.pct !== null && (
                <Box
                  sx={{
                    minHeight: 25,
                    px: 1.1,
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    bgcolor: offer.pct < 0 ? COLORS.positiveSoft : COLORS.negativeSoft,
                    color: changeColor(offer.pct),
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {changeLabel(offer.pct)} overnight
                </Box>
              )}
            </Stack>
          </Box>

          <Card>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.ink }}>
                Since we started watching
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.inkMuted }}>
                {points.length || "…"} {points.length === 1 ? "night" : "nights"}
              </Typography>
            </Stack>
            {points.length > 1 ? (
              <>
                <Stack direction="row" spacing="6px" alignItems="flex-end" sx={{ height: 52, mt: 1.4 }} aria-hidden>
                  {points.map((point, index) => (
                    <Box
                      key={point.day}
                      sx={{
                        flex: 1,
                        height: `${peak > 0 ? Math.max((point.total / peak) * 100, 8) : 8}%`,
                        borderRadius: "3px",
                        bgcolor: index === points.length - 1 ? changeColor(offer.pct) : COLORS.borderStrong,
                      }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.9 }}>
                  <Typography sx={{ fontSize: 11, color: COLORS.inkFaint }}>
                    €{low.toLocaleString("en-GB")} low
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.inkFaint }}>
                    tonight €{offer.total.toLocaleString("en-GB")}
                  </Typography>
                </Stack>
              </>
            ) : (
              <Typography sx={{ mt: 1.2, fontSize: 12, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                {history.isLoading
                  ? "Loading the price history…"
                  : "First seen in tonight's collection — there is nothing earlier to compare it against yet."}
              </Typography>
            )}
          </Card>

          <Box sx={{ px: 2, mt: 1.6, display: "flex", flexWrap: "wrap", gap: 0.9 }}>
            <Fact>{shortDeparture(offer.departure)}</Fact>
            {offer.nights && <Fact>{offer.nights} nights</Fact>}
            <Fact>👥 {offer.pax}</Fact>
            <Fact>{offer.countryName}</Fact>
            <Fact>{offer.brandName}</Fact>
          </Box>

          {others.length === 0 && (
            <Typography sx={{ px: 2, mt: 2.2, fontSize: 11.5, color: COLORS.inkFaint, lineHeight: 1.55 }}>
              No other operator we track sells this property on this date, so there is nothing to compare it
              against.
            </Typography>
          )}

          {others.length > 0 && (
            <Box sx={{ px: 2, mt: 2.2 }}>
              <Typography sx={{ mb: 1.1, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: COLORS.inkMuted }}>
                Same hotel, other operators
              </Typography>
              <Box sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, overflow: "hidden", bgcolor: COLORS.surface }}>
                {others.map((other, index) => {
                  const diff = other.total - offer.total;
                  return (
                    <Box
                      key={other.key}
                      component="button"
                      type="button"
                      onClick={() => onPick(other)}
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1.75,
                        py: 1.4,
                        textAlign: "left",
                        border: "none",
                        borderBottom: index === others.length - 1 ? "none" : `1px solid ${COLORS.border}`,
                        bgcolor: "transparent",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>
                          {other.brandName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: COLORS.inkMuted }}>
                          {shortDeparture(other.departure)}
                          {other.nights ? ` · ${other.nights}n` : ""} · 👥{other.pax}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
                          €{other.total.toLocaleString("en-GB")}
                        </Typography>
                        {diff !== 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 600, color: diff < 0 ? COLORS.positive : COLORS.negative }}>
                            €{Math.abs(diff).toLocaleString("en-GB")} {diff < 0 ? "cheaper" : "dearer"}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 2, pt: 1.3, pb: "calc(16px + env(safe-area-inset-bottom))", borderTop: `1px solid ${COLORS.border}`, bgcolor: COLORS.canvas }}>
          <Box
            component={offer.url ? "a" : "button"}
            {...(offer.url ? { href: offer.url, target: "_blank", rel: "noopener noreferrer" } : { type: "button", disabled: true })}
            sx={{
              width: "100%",
              minHeight: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              borderRadius: 3.5,
              border: "none",
              textDecoration: "none",
              bgcolor: offer.url ? COLORS.brand : COLORS.border,
              color: offer.url ? COLORS.canvas : COLORS.inkMuted,
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: offer.url ? "pointer" : "default",
            }}
          >
            {offer.url ? `Open on ${offer.brandName}` : "No link from this operator"}
            {offer.url && <OpenInNewRoundedIcon sx={{ fontSize: 17 }} />}
          </Box>
        </Box>
      </Stack>
    </Dialog>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ mx: 2, p: 1.75, bgcolor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4 }}>
      {children}
    </Box>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: 31, px: 1.4, display: "inline-flex", alignItems: "center", borderRadius: 999, bgcolor: COLORS.frost }}>
      <Typography sx={{ fontSize: 12, color: COLORS.ink }}>{children}</Typography>
    </Box>
  );
}
