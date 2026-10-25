"use client";

import { useMemo, useState } from "react";
import { Box, Drawer, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";
import { BRANDS } from "@/lib/brands/config";
import { PROPERTY_TYPE_ICON, PROPERTY_TYPE_LABEL } from "@/lib/table/hotels";
import type { PropertyType } from "@/lib/brands/types";
import {
  countBy,
  filterMobileOffers,
  SORT_LABEL,
  type MobileFilters,
  type MobileOffer,
  type MobileSort,
} from "@/lib/mobile/model";
import { useMobileFilters } from "@/lib/mobile/useMobile";
import { ValuePicker } from "./ValuePicker";

const TYPES: PropertyType[] = ["hotel", "club", "apartment", "chalet"];
const PARTY_SIZES = [1, 2, 3, 4, 5, 6];

/**
 * Every column the desktop table has, as one sheet.
 *
 * Resort and Hotel are drill-in rows rather than chip rows because they have
 * hundreds of values each; everything else fits as chips you can hit without
 * looking. The button at the bottom carries the count the current settings
 * would produce, so you commit to a number rather than to a guess.
 */
export function FilterSheet({
  open,
  onClose,
  offers,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  offers: MobileOffer[];
  filters: MobileFilters;
}) {
  const set = useMobileFilters((state) => state.set);
  const reset = useMobileFilters((state) => state.reset);
  const [picker, setPicker] = useState<"resort" | "hotel" | null>(null);

  const resortOptions = useMemo(
    () => countBy(offers, (offer) => offer.resortKey, (offer) => `${offer.resort} ${offer.flag}`),
    [offers]
  );

  // The hotel list follows the resort choice: 300 names in three resorts
  // rather than every hotel every operator sells.
  const hotelScope = useMemo(
    () => (filters.resorts ? offers.filter((offer) => filters.resorts?.includes(offer.resortKey)) : offers),
    [offers, filters.resorts]
  );
  const hotelOptions = useMemo(
    () =>
      countBy(
        hotelScope,
        (offer) => offer.hotelKey || undefined,
        (offer) => `${PROPERTY_TYPE_ICON[offer.propertyType]} ${offer.hotel ?? "Unnamed"}`
      ),
    [hotelScope]
  );
  const countryOptions = useMemo(
    () => countBy(offers, (offer) => offer.countryCode, (offer) => `${offer.flag} ${offer.countryName}`),
    [offers]
  );
  const nightOptions = useMemo(() => {
    const seen = new Set<number>();
    for (const offer of offers) if (offer.nights) seen.add(offer.nights);
    return [...seen].sort((a, b) => a - b);
  }, [offers]);
  const partyOptions = useMemo(() => {
    const seen = new Set<number>();
    for (const offer of offers) seen.add(offer.pax);
    return PARTY_SIZES.filter((size) => seen.has(size));
  }, [offers]);
  const priceCeiling = useMemo(
    () => offers.reduce((max, offer) => Math.max(max, offer.total), 0),
    [offers]
  );

  const resultCount = useMemo(() => filterMobileOffers(offers, filters).length, [offers, filters]);

  // Tapping a chip while nothing is filtered means "show me this one", not
  // "hide this one" — on a phone a chip reads as a destination. After that it
  // is an ordinary add/remove, and emptying it goes back to showing everything
  // rather than leaving a blank list with no way out.
  const toggleIn = (
    field: "countries" | "brands",
    value: string,
    every: string[]
  ) => {
    const current = filters[field];
    if (current === null) {
      set({ [field]: [value] });
      return;
    }
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    set({ [field]: next.length === 0 || next.length === every.length ? null : next });
  };

  const brandValues = BRANDS.map((brand) => brand.slug);
  const countryValues = countryOptions.map((option) => option.value);

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              height: "92dvh",
              bgcolor: COLORS.surface,
              backgroundImage: "none",
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderTop: `1px solid ${COLORS.borderStrong}`,
            },
          },
        }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ pt: 1.2, pb: 0.3, display: "flex", justifyContent: "center" }} aria-hidden>
            <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: COLORS.borderStrong }} />
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.25, pt: 0.75, pb: 1.25, borderBottom: `1px solid ${COLORS.border}` }}
          >
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: COLORS.ink }}>
              Filters
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={reset}
              sx={{ minHeight: 40, border: "none", bgcolor: "transparent", color: COLORS.brand, fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Reset all
            </Box>
          </Stack>

          <Box sx={{ flex: 1, overflowY: "auto", px: 2.25, WebkitOverflowScrolling: "touch" }}>
            <DrillRow
              label="Resort"
              sub={
                filters.resorts
                  ? resortOptions
                      .filter((option) => filters.resorts?.includes(option.value))
                      .map((option) => option.label)
                      .join(", ") || "none"
                  : `${resortOptions.length} resorts`
              }
              value={filters.resorts ? `${filters.resorts.length} selected` : "Any"}
              onClick={() => setPicker("resort")}
            />
            <DrillRow
              label="Hotel"
              sub={filters.resorts ? `${hotelOptions.length} in your resorts` : `${hotelOptions.length} hotels`}
              value={filters.hotels ? `${filters.hotels.length} selected` : "Any"}
              onClick={() => setPicker("hotel")}
            />

            <Section label="Country">
              <ChipGroup>
                <Chip label="All" on={filters.countries === null} onClick={() => set({ countries: null })} />
                {countryOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    on={filters.countries?.includes(option.value) ?? false}
                    onClick={() => toggleIn("countries", option.value, countryValues)}
                  />
                ))}
              </ChipGroup>
            </Section>

            <Section label="Operator">
              <ChipGroup>
                <Chip label={`All ${BRANDS.length}`} on={filters.brands === null} onClick={() => set({ brands: null })} />
                {BRANDS.map((brand) => (
                  <Chip
                    key={brand.slug}
                    label={brand.name}
                    on={filters.brands?.includes(brand.slug) ?? false}
                    onClick={() => toggleIn("brands", brand.slug, brandValues)}
                  />
                ))}
              </ChipGroup>
            </Section>

            <Section label="Type">
              <ChipGroup>
                {TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={`${PROPERTY_TYPE_ICON[type]} ${PROPERTY_TYPE_LABEL[type]}`}
                    on={filters.types.includes(type)}
                    onClick={() =>
                      set({
                        types: filters.types.includes(type)
                          ? filters.types.filter((t) => t !== type)
                          : [...filters.types, type],
                      })
                    }
                  />
                ))}
              </ChipGroup>
            </Section>

            <Section label="People">
              <ChipGroup>
                {partyOptions.map((size) => (
                  <Chip
                    key={size}
                    label={String(size)}
                    on={filters.party === size}
                    onClick={() => set({ party: filters.party === size ? "any" : size })}
                  />
                ))}
                <Chip label="Any" on={filters.party === "any"} onClick={() => set({ party: "any" })} />
              </ChipGroup>
            </Section>

            <Section label="Nights">
              <ChipGroup>
                {nightOptions.map((nights) => (
                  <Chip
                    key={nights}
                    label={`${nights}n`}
                    on={filters.nights?.includes(nights) ?? false}
                    onClick={() => {
                      const base = filters.nights ?? [];
                      const next = base.includes(nights) ? base.filter((n) => n !== nights) : [...base, nights];
                      set({ nights: next.length === 0 ? null : next });
                    }}
                  />
                ))}
                <Chip label="Any" on={filters.nights === null} onClick={() => set({ nights: null })} />
              </ChipGroup>
            </Section>

            <Section label="Departure">
              <Stack direction="row" spacing={1} alignItems="center">
                <DateField value={filters.from} onChange={(from) => set({ from })} label="From" />
                <Typography aria-hidden sx={{ color: COLORS.inkMuted, fontSize: 13 }}>→</Typography>
                <DateField value={filters.to} onChange={(to) => set({ to })} label="To" />
              </Stack>
            </Section>

            <Section
              label="Total price"
              aside={filters.maxTotal === null ? "any" : `up to €${filters.maxTotal.toLocaleString("en-GB")}`}
            >
              <PriceSlider
                offers={offers}
                ceiling={priceCeiling}
                value={filters.maxTotal}
                onChange={(maxTotal) => set({ maxTotal })}
              />
            </Section>

            <Section
              label="Price per person"
              aside={filters.maxPerPerson === null ? "any" : `up to €${filters.maxPerPerson.toLocaleString("en-GB")}`}
            >
              <ChipGroup>
                {[600, 900, 1500, 2500].map((cap) => (
                  <Chip
                    key={cap}
                    label={`≤ €${cap.toLocaleString("en-GB")}`}
                    on={filters.maxPerPerson === cap}
                    onClick={() => set({ maxPerPerson: filters.maxPerPerson === cap ? null : cap })}
                  />
                ))}
                <Chip label="Any" on={filters.maxPerPerson === null} onClick={() => set({ maxPerPerson: null })} />
              </ChipGroup>
            </Section>

            <Section label="Overnight change">
              <ChipGroup>
                <Chip label="Any" on={filters.change === "any"} onClick={() => set({ change: "any" })} />
                <Chip label="↓ Dropped" on={filters.change === "down"} onClick={() => set({ change: "down" })} />
                <Chip label="↑ Rose" on={filters.change === "up"} onClick={() => set({ change: "up" })} />
              </ChipGroup>
            </Section>

            <Section label="Status">
              <ChipGroup>
                <Chip label="Any" on={filters.status === "any"} onClick={() => set({ status: "any" })} />
                <Chip label="New today" on={filters.status === "new"} onClick={() => set({ status: "new" })} />
              </ChipGroup>
            </Section>

            <Section label="Sort by">
              <ChipGroup>
                {(Object.keys(SORT_LABEL) as MobileSort[]).map((sort) => (
                  <Chip key={sort} label={SORT_LABEL[sort]} on={filters.sort === sort} onClick={() => set({ sort })} />
                ))}
              </ChipGroup>
            </Section>

            <Box sx={{ height: 12 }} />
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{ px: 2.25, pt: 1.4, pb: "calc(18px + env(safe-area-inset-bottom))", borderTop: `1px solid ${COLORS.border}` }}
          >
            <Box
              component="button"
              type="button"
              onClick={onClose}
              sx={{ flexShrink: 0, minHeight: 48, px: 2.2, borderRadius: 3.5, border: `1px solid ${COLORS.borderStrong}`, bgcolor: "transparent", color: COLORS.ink, fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Close
            </Box>
            <Box
              component="button"
              type="button"
              onClick={onClose}
              sx={{ flex: 1, minHeight: 48, borderRadius: 3.5, border: "none", bgcolor: COLORS.brand, color: COLORS.canvas, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
            >
              Show {resultCount.toLocaleString("en-GB")} offers
            </Box>
          </Stack>
        </Stack>
      </Drawer>

      <ValuePicker
        open={picker === "resort"}
        title="Resort"
        subtitle={filters.resorts ? `${filters.resorts.length} of ${resortOptions.length} selected` : `${resortOptions.length} resorts`}
        options={resortOptions}
        selected={filters.resorts}
        onChange={(resorts) => set({ resorts, hotels: null })}
        onClose={() => setPicker(null)}
        resultCount={resultCount}
      />
      <ValuePicker
        open={picker === "hotel"}
        title="Hotel"
        subtitle={filters.resorts ? "In your selected resorts" : `${hotelOptions.length} hotels`}
        options={hotelOptions}
        selected={filters.hotels}
        onChange={(hotels) => set({ hotels })}
        onClose={() => setPicker(null)}
        resultCount={resultCount}
      />
    </>
  );
}

function DrillRow({ label, sub, value, onClick }: { label: string; sub: string; value: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: "100%",
        minHeight: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        py: 1.2,
        textAlign: "left",
        border: "none",
        borderBottom: `1px solid ${COLORS.border}`,
        bgcolor: "transparent",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: COLORS.inkMuted }}>
          {label}
        </Typography>
        <Typography noWrap sx={{ fontSize: 11, color: COLORS.inkFaint }}>{sub}</Typography>
      </Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{value}</Typography>
        <ChevronRightRoundedIcon sx={{ fontSize: 18, color: COLORS.inkFaint }} />
      </Stack>
    </Box>
  );
}

function Section({ label, aside, children }: { label: string; aside?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 1.6, borderBottom: `1px solid ${COLORS.border}` }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: COLORS.inkMuted }}>
          {label}
        </Typography>
        {aside && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
            {aside}
          </Typography>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.9 }}>{children}</Box>;
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={on}
      onClick={onClick}
      sx={{
        minHeight: 40,
        px: 1.6,
        borderRadius: 999,
        border: on ? "none" : `1px solid ${COLORS.borderStrong}`,
        bgcolor: on ? COLORS.frost : "transparent",
        color: on ? COLORS.ink : COLORS.inkMuted,
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {label}
      {on && " ✓"}
    </Box>
  );
}

function DateField({ value, onChange, label }: { value: string | null; onChange: (next: string | null) => void; label: string }) {
  return (
    <Box
      component="input"
      type="date"
      aria-label={`${label} date`}
      value={value ?? ""}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value || null)}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        px: 1.5,
        borderRadius: 3,
        border: `1px solid ${COLORS.borderStrong}`,
        bgcolor: "transparent",
        color: value ? COLORS.ink : COLORS.inkMuted,
        fontSize: 13,
        fontFamily: "inherit",
      }}
    />
  );
}

/**
 * A histogram above the slider, so you can see where the offers actually sit
 * before moving anything — the shape is the reason this control beats a
 * number field.
 */
function PriceSlider({
  offers,
  ceiling,
  value,
  onChange,
}: {
  offers: MobileOffer[];
  ceiling: number;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const buckets = useMemo(() => {
    const count = 12;
    const size = Math.max(Math.ceil(ceiling / count), 1);
    const bins = new Array(count).fill(0) as number[];
    for (const offer of offers) {
      const index = Math.min(Math.floor(offer.total / size), count - 1);
      bins[index] += 1;
    }
    const peak = Math.max(...bins, 1);
    return bins.map((n, index) => ({ height: (n / peak) * 100, from: index * size }));
  }, [offers, ceiling]);

  const cap = value ?? ceiling;

  return (
    <Box>
      <Stack direction="row" spacing="3px" alignItems="flex-end" sx={{ height: 34 }} aria-hidden>
        {buckets.map((bucket) => (
          <Box
            key={bucket.from}
            sx={{
              flex: 1,
              height: `${Math.max(bucket.height, 4)}%`,
              borderRadius: "2px",
              bgcolor: bucket.from <= cap ? COLORS.brand : COLORS.border,
            }}
          />
        ))}
      </Stack>
      <Box
        component="input"
        type="range"
        aria-label="Maximum total price"
        min={0}
        max={ceiling || 1}
        step={50}
        value={cap}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const next = Number(event.target.value);
          onChange(next >= ceiling ? null : next);
        }}
        sx={{ width: "100%", mt: 1, accentColor: COLORS.brand, height: 36 }}
      />
    </Box>
  );
}
