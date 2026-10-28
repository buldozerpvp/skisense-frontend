"use client";

import { useMemo } from "react";
import { Box, Dialog, Drawer, IconButton, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/lib/design/tokens";
import { buildSeriesIndex, offerKey } from "@/lib/analytics/derive";
import { useAllOffers } from "@/lib/query/usePrices";
import { PROPERTY_TYPE_ICON, PROPERTY_TYPE_LABEL } from "@/lib/table/hotels";
import { shortDeparture, stayRange, type MobileOffer } from "@/lib/mobile/model";
import { useResortCard } from "@/lib/resorts/useResortCard";
import { resortInfo } from "@/lib/resorts/resort-info";
import { hotelPhotos } from "@/lib/resorts/hotel-photos";
import { PhotoCarousel, type CarouselPhoto } from "@/components/resorts/PhotoCarousel";
import { hotelPlace } from "@/lib/resorts/hotel-places";
import { offerInclusions, type Inclusion } from "@/lib/offers/inclusions";
import { BOARD_DETAIL, BOARD_ICON, BOARD_LABEL, roomLabel } from "@/lib/offers/board";
import { HotelMap } from "@/components/resorts/HotelMap";
import { changeColor, changeLabel } from "./OfferRow";
import { OfferHistory } from "./OfferHistory";

/**
 * Where an offer's detail is shown: full screen on a phone, a panel beside
 * the table on a desktop.
 *
 * Only the shell differs. Everything inside — the photos or the map, the
 * price, the history chart, what the price includes, the same hotel at other
 * operators — is one tree rendered by both, because two copies of this would
 * have drifted apart by the second change.
 */
export type OfferSurface = "sheet" | "drawer";

/**
 * One offer, in full.
 *
 * This is where the detail beats the table rather than apologising to it: a
 * row can show a price, but it cannot show the same hotel at three operators
 * or six nights of history, and those are the two things that decide a booking.
 */
export function OfferSheet({
  offer,
  siblings,
  onClose,
  onPick,
  surface = "sheet",
}: {
  offer: MobileOffer | null;
  siblings: MobileOffer[];
  onClose: () => void;
  onPick: (offer: MobileOffer) => void;
  /** "sheet" is the phone's full screen; "drawer" is the desktop panel. */
  surface?: OfferSurface;
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

  // Pictures of the property where we have them — five of sixty-nine do.
  // Everywhere else a map of where the place stands takes their slot: it is
  // the other thing you want to know about a hotel, and the one we can source
  // honestly. A photo of the valley captioned as the hotel would be a lie
  // with a price next to it.
  const ownPhotos = hotelPhotos(offer?.hotelKey);
  const resort = resortInfo(offer?.resortKey);
  const gallery: CarouselPhoto[] = ownPhotos.map((photo) => ({ ...photo, caption: offer?.hotel }));
  const place = gallery.length === 0 ? hotelPlace(offer?.hotelKey, offer?.resortKey) : undefined;
  // The operator's habit, overwritten by anything this offer's own page
  // actually stated — which for an Ophir deal is the whole flight.
  const included = offer ? offerInclusions(offer.source, offer.stated) : undefined;

  if (!offer) return null;

  const drawer = surface === "drawer";
  // One tree, two shells. The drawer keeps the table visible on the left so
  // offers can be opened one after another and compared; the phone has no
  // room for that and takes the screen.
  const Shell = drawer ? DrawerShell : DialogShell;

  return (
    <Shell onClose={onClose}>
      <Stack sx={{ height: "100%" }}>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ px: 1.25, py: 1.1, bgcolor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <IconButton
            onClick={onClose}
            aria-label={drawer ? "Close this offer" : "Back to the list"}
            sx={{ color: COLORS.ink }}
          >
            {drawer ? <CloseRoundedIcon sx={{ fontSize: 20 }} /> : <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />}
          </IconButton>
          <Box
            component="button"
            type="button"
            onClick={() => useResortCard.getState().open(offer.resortKey, offer.resort)}
            sx={{
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              border: "none",
              bgcolor: "transparent",
              p: 0,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.ink,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {offer.resort} {offer.flag}{" "}
            <Box component="span" sx={{ fontSize: 11, color: COLORS.brand, fontWeight: 600 }}>
              About
            </Box>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Box sx={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", pb: 3 }}>
          {gallery.length > 0 && <PhotoCarousel photos={gallery} height={200} />}

          {place && (
            <HotelMap place={place} hotel={offer.hotel} resort={resort?.name ?? offer.resort} height={200} />
          )}

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

          {/* The facts strip gets its own breathing room above the chart:
              butted straight against the card, the chips read as its header
              rather than as a separate line about the offer. */}
          <Box sx={{ px: 2, mt: 1.6, mb: 1, display: "flex", flexWrap: "wrap", gap: 0.9 }}>
            {/* Both ends of the stay, not just the departure — the day you
                come home is half of what makes a week fit. */}
            <Fact>{stayRange(offer.departure, offer.nights)}</Fact>
            {offer.nights && <Fact>{offer.nights} nights</Fact>}
            <Fact>👥 {offer.pax}</Fact>
            <Fact>{offer.countryName}</Fact>
            <Fact>{offer.brandName}</Fact>
          </Box>

          <Card>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.ink }}>
                What this offer has cost
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.inkMuted }}>
                {points.length || "…"} {points.length === 1 ? "night" : "nights"} watched
              </Typography>
            </Stack>
            <OfferHistory points={points} isLoading={history.isLoading} />
          </Card>

          {/* What the number actually buys. Without this the cheapest row on
              the screen can be the one that leaves you to book your own
              flight. */}
          {included && (
            <Box sx={{ mx: 2, mt: 2.2, p: 2, bgcolor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.lg}px` }}>
              <Typography sx={{ mb: 1.1, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: COLORS.inkMuted }}>
                In the price
              </Typography>
              <Stack spacing={0.7}>
                <Line
                  state={included.flights}
                  label={included.departsFrom ? `Flights from ${included.departsFrom}` : "Flights"}
                />
                <Line state={included.transfers} label="Airport transfers" />
                <Line
                  state={included.liftPass}
                  label={
                    offer.stated.liftPassDays
                      ? `Lift pass — ${offer.stated.liftPassDays} ${offer.stated.liftPassDays === 1 ? "day" : "days"}`
                      : "Lift pass"
                  }
                />
                <Line
                  state={offer.board === "unknown" ? "varies" : "yes"}
                  suffix={false}
                  label={
                    offer.board === "unknown"
                      ? "Meals — not stated"
                      : `${BOARD_ICON[offer.board]} ${BOARD_LABEL[offer.board]}`
                  }
                />
              </Stack>

              {(offer.stated.airline || offer.stated.baggageKg !== undefined) && (
                <Typography sx={{ mt: 1, fontSize: 11.5, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                  {offer.stated.airline ? `Flown by ${offer.stated.airline}. ` : ""}
                  {offer.stated.baggageKg !== undefined
                    ? `${offer.stated.baggageKg} kg checked in${
                        offer.stated.cabinKg !== undefined ? `, ${offer.stated.cabinKg} kg cabin` : ""
                      }, per person.`
                    : ""}
                </Typography>
              )}

              <Typography sx={{ mt: 1, fontSize: 11.5, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                {BOARD_DETAIL[offer.board]}
                {offer.boardRaw && offer.board !== "unknown" ? ` The operator calls it “${offer.boardRaw}”.` : ""}
              </Typography>

              <Typography sx={{ mt: 0.5, fontSize: 11.5, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                Priced for a {roomLabel(offer.pax).toLowerCase()} — {offer.pax}{" "}
                {offer.pax === 1 ? "person" : "people"} sharing. An offer sold for a different party size is a
                different price, not this one divided.
              </Typography>
              <Typography sx={{ mt: 1.2, fontSize: 11, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                {included.note}
              </Typography>
              {included.confidence !== "high" && (
                <Typography sx={{ mt: 0.6, fontSize: 10.5, color: COLORS.inkFaint, lineHeight: 1.5 }}>
                  From {included.evidence} — check the operator&apos;s own page before booking.
                </Typography>
              )}
            </Box>
          )}

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
              <Box sx={{ border: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.lg}px`, overflow: "hidden", bgcolor: COLORS.surface }}>
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

        {/* A card that stops dead at the action bar reads as clipped rather
            than as "there is more below". The fade belongs to the scroll
            frame, not to the scrolling content, so it stays put while the
            cards move under it. */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 28,
            pointerEvents: "none",
            background: `linear-gradient(to bottom, color-mix(in srgb, ${COLORS.canvas} 0%, transparent), ${COLORS.canvas})`,
          }}
        />
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
              borderRadius: `${RADIUS.pill}px`,
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
    </Shell>
  );
}

/** The phone: the offer takes the screen, because there is nothing to keep. */
function DialogShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Dialog
      fullScreen
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: COLORS.canvas, backgroundImage: "none", height: "100dvh" } } }}
    >
      {children}
    </Dialog>
  );
}

/**
 * The desktop: a panel on the right, with the table still readable beside it.
 *
 * Its width is capped rather than proportional — the content is one column of
 * cards designed at phone width, and stretching it to half a 27-inch monitor
 * would leave a photo three feet wide above two lines of text.
 */
function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100vw", sm: 440 },
            maxWidth: "100vw",
            bgcolor: COLORS.canvas,
            backgroundImage: "none",
            borderLeft: `1px solid ${COLORS.border}`,
          },
        },
      }}
    >
      {children}
    </Drawer>
  );
}

/** One inclusion: a tick, a cross, or an honest question mark. */
function Line({ state, label, suffix = true }: { state: Inclusion; label: string; suffix?: boolean }) {
  const mark = state === "yes" ? "✓" : state === "no" ? "✕" : "?";
  const colour = state === "yes" ? COLORS.positive : state === "no" ? COLORS.negative : COLORS.inkMuted;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        aria-hidden
        sx={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: state === "yes" ? COLORS.positiveSoft : state === "no" ? COLORS.negativeSoft : COLORS.frost,
          color: colour,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {mark}
      </Box>
      <Typography sx={{ fontSize: 12.5, color: state === "no" ? COLORS.inkMuted : COLORS.ink }}>
        {label}
        {state === "varies" && suffix ? " — on some packages" : ""}
      </Typography>
    </Stack>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ mx: 2, p: 2, bgcolor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.lg}px` }}>
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
