"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";
import { activeFilterCount, type MobileOffer } from "@/lib/mobile/model";
import { useFilterValues, useMobileData } from "@/lib/mobile/useMobile";
import { ActiveChips } from "./MobileOffers";

type View = "where" | "moved" | "when";

const VIEWS: { id: View; label: string }[] = [
  { id: "where", label: "Where" },
  { id: "moved", label: "What moved" },
  { id: "when", label: "When" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Three questions, one screen.
 *
 * The charts are the phone-sized versions of the desktop cards, and they read
 * the same filtered set the offers tab does — narrow to Bulgaria and the
 * analytics narrow with you, rather than answering about a market you are
 * not shopping in.
 */
export function MobileAnalytics() {
  const { visible, isLoading, hasHistory } = useMobileData();
  const filters = useFilterValues();
  const [view, setView] = useState<View>("where");

  const cheapest = useMemo(() => {
    const best = new Map<string, MobileOffer>();
    for (const offer of visible) {
      const current = best.get(offer.resortKey);
      if (!current || offer.total < current.total) best.set(offer.resortKey, offer);
    }
    return [...best.values()].sort((a, b) => a.total - b.total).slice(0, 10);
  }, [visible]);

  const movers = useMemo(
    () =>
      visible
        .filter((offer) => offer.pct !== null && Math.abs(offer.pct) >= 1)
        .sort((a, b) => Math.abs(b.pct as number) - Math.abs(a.pct as number))
        .slice(0, 10),
    [visible]
  );

  // Median rather than mean: one Val Thorens week would drag an average
  // month far above anything you could actually book that month.
  //
  // The band is drawn in one hue at varying weight, never the aqua/red pair:
  // that pair means price *change*, and an expensive month is not a month
  // that rose.
  const months = useMemo(() => {
    const byMonth = new Map<number, number[]>();
    for (const offer of visible) {
      const month = Number(offer.departure.slice(5, 7)) - 1;
      if (Number.isNaN(month)) continue;
      const list = byMonth.get(month) ?? [];
      list.push(offer.total);
      byMonth.set(month, list);
    }
    const rows = [...byMonth.entries()]
      .map(([month, totals]) => {
        const sorted = totals.sort((a, b) => a - b);
        return { month, median: sorted[Math.floor(sorted.length / 2)], count: totals.length };
      })
      .sort((a, b) => a.month - b.month);
    const peak = Math.max(...rows.map((row) => row.median), 1);
    const low = Math.min(...rows.map((row) => row.median), peak);
    return rows.map((row) => ({ ...row, peak, low }));
  }, [visible]);

  const maxTotal = cheapest.length ? cheapest[cheapest.length - 1].total : 1;

  return (
    <>
      <Box sx={{ flex: "0 0 auto", px: 2, pt: 1.5, pb: 1 }}>
        <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: COLORS.ink }}>
          Analytics
        </Typography>
        <Typography sx={{ mt: 0.4, fontSize: 12, color: COLORS.inkMuted }}>
          {visible.length.toLocaleString("en-GB")} offers
          {activeFilterCount(filters) > 0 || filters.query ? " matching your filters" : ""}
          {hasHistory ? "" : " · loading history"}
        </Typography>
      </Box>

      <ActiveChips filters={filters} />

      <Stack direction="row" spacing={0.9} sx={{ flex: "0 0 auto", px: 2, pb: 1.25 }}>
        {VIEWS.map((entry) => (
          <Box
            key={entry.id}
            component="button"
            type="button"
            aria-pressed={view === entry.id}
            onClick={() => setView(entry.id)}
            sx={{
              flex: 1,
              minHeight: 38,
              borderRadius: 999,
              border: view === entry.id ? "none" : `1px solid ${COLORS.borderStrong}`,
              bgcolor: view === entry.id ? COLORS.brand : "transparent",
              color: view === entry.id ? COLORS.canvas : COLORS.ink,
              fontSize: 12.5,
              fontWeight: view === entry.id ? 700 : 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {entry.label}
          </Box>
        ))}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pb: 2, WebkitOverflowScrolling: "touch" }}>
        {isLoading && <Typography sx={{ p: 3, fontSize: 13, color: COLORS.inkMuted, textAlign: "center" }}>Loading…</Typography>}

        {!isLoading && view === "where" && (
          <Card title="Cheapest resorts" note="Lowest total currently on sale in each resort.">
            {cheapest.map((offer) => (
              <Box key={offer.resortKey} sx={{ mb: 1.4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.ink }}>
                    {offer.resort} {offer.flag}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
                    €{offer.total.toLocaleString("en-GB")}
                  </Typography>
                </Stack>
                <Box sx={{ height: 7, borderRadius: 999, bgcolor: COLORS.border, overflow: "hidden" }}>
                  <Box sx={{ width: `${(offer.total / maxTotal) * 100}%`, height: "100%", borderRadius: 999, bgcolor: COLORS.brand }} />
                </Box>
              </Box>
            ))}
            {cheapest.length === 0 && <Empty />}
          </Card>
        )}

        {!isLoading && view === "moved" && (
          <Card title="Biggest moves overnight" note="Each offer against its own previous observation.">
            {movers.map((offer) => (
              <Stack
                key={offer.key}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ py: 1.1, borderBottom: `1px solid ${COLORS.border}`, gap: 1.5 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12.5, color: COLORS.ink }}>
                    {offer.resort} {offer.flag}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 11, color: COLORS.inkMuted }}>
                    {offer.hotel ?? offer.brandName} · €{offer.total.toLocaleString("en-GB")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flexShrink: 0,
                    minHeight: 26,
                    px: 1.1,
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    bgcolor: (offer.pct as number) < 0 ? COLORS.positiveSoft : COLORS.negativeSoft,
                    color: (offer.pct as number) < 0 ? COLORS.positive : COLORS.negative,
                    fontSize: 11.5,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {(offer.pct as number) > 0 ? "+" : "−"}
                  {Math.abs(offer.pct as number).toFixed(1)}%
                </Box>
              </Stack>
            ))}
            {movers.length === 0 && (
              <Typography sx={{ py: 2, fontSize: 12.5, color: COLORS.inkMuted, textAlign: "center" }}>
                {hasHistory ? "Nothing moved by more than 1% last night." : "Loading the price history…"}
              </Typography>
            )}
          </Card>
        )}

        {!isLoading && view === "when" && (
          <Card title="When to go" note="Median total per departure month — the fuller the bar, the dearer.">
            <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ mt: 0.5 }}>
              {months.map((row) => {
                const span = row.peak - row.low || 1;
                const heat = (row.median - row.low) / span;
                return (
                  <Box key={row.month} sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 34,
                        mx: "auto",
                        height: 30 + heat * 54,
                        borderRadius: 1.25,
                        bgcolor: COLORS.brand,
                        opacity: 0.4 + heat * 0.6,
                      }}
                    />
                    <Typography sx={{ mt: 0.6, fontSize: 10, color: COLORS.inkMuted }}>
                      {MONTHS[row.month]}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
            {months.length > 0 && (
              <Typography sx={{ mt: 1.4, fontSize: 11.5, color: COLORS.inkMuted, lineHeight: 1.55 }}>
                Cheapest month is {MONTHS[months.reduce((best, row) => (row.median < best.median ? row : best), months[0]).month]} at
                €{months.reduce((best, row) => (row.median < best.median ? row : best), months[0]).median.toLocaleString("en-GB")} median;
                dearest is {MONTHS[months.reduce((worst, row) => (row.median > worst.median ? row : worst), months[0]).month]}.
              </Typography>
            )}
            {months.length === 0 && <Empty />}
          </Card>
        )}
      </Box>
    </>
  );
}

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 1.75, bgcolor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>{title}</Typography>
      <Typography sx={{ mt: 0.3, mb: 1.4, fontSize: 11, color: COLORS.inkFaint }}>{note}</Typography>
      {children}
    </Box>
  );
}

function Empty() {
  return (
    <Typography sx={{ py: 2, fontSize: 12.5, color: COLORS.inkMuted, textAlign: "center" }}>
      Nothing matches your filters.
    </Typography>
  );
}
