"use client";

import { Box, Stack } from "@mui/material";
import { useEffect, useMemo } from "react";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import { Alert, AlertTitle } from "@mui/material";
import { useLatestOffers } from "@/lib/query/usePrices";
import { BrandsTable } from "@/components/table/BrandsTable";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { useAppStore } from "@/lib/store/useAppStore";
import { getBrand } from "@/lib/brands/config";
import { BrandAnalytics } from "@/components/charts/BrandAnalytics";
import { BrandHero, type BrandStat } from "./BrandHero";

/**
 * Brand page body for any source with live data: banner plus the shared
 * combined table, scoped to that brand while the page is open.
 */
export function BrandOffersContent({ slug, tagline }: { slug: string; tagline?: string }) {
  const brand = getBrand(slug);
  const { data, isLoading } = useLatestOffers();
  const source = useMemo(() => data?.find((s) => s.source === slug), [data, slug]);
  const setSelectedBrands = useAppStore((s) => s.setSelectedBrands);

  const stats = useMemo<BrandStat[]>(() => {
    const rows = source?.data ?? [];
    const avgPrice = rows.length > 0 ? rows.reduce((sum, r) => sum + r.priceEur, 0) / rows.length : 0;
    const nights = [...new Set(rows.map((r) => r.nights).filter((n): n is number => Boolean(n)))].sort(
      (a, b) => a - b
    );

    const list: BrandStat[] = [
      { value: String(rows.length), label: "priced dates" },
      { value: String(new Set(rows.map((r) => r.resort)).size), label: "properties" },
      { value: `€${Math.round(avgPrice).toLocaleString()}`, label: "average" },
    ];
    if (nights.length > 0) list.push({ value: nights.join(" / "), label: "nights" });
    if (source?.day) list.push({ value: source.day, label: "last updated" });
    return list;
  }, [source]);

  useEffect(() => {
    setSelectedBrands([slug]);
    return () => setSelectedBrands([]);
  }, [setSelectedBrands, slug]);

  // A source that is registered but hasn't produced a snapshot yet would
  // otherwise render as a page of zeroes with no explanation: empty hero
  // figures, no analytics (it hides itself) and an empty table.
  const hasRows = (source?.data.length ?? 0) > 0;

  if (!isLoading && !hasRows) {
    return (
      <Stack spacing={4}>
        <BrandHero brand={brand} slug={slug} tagline={tagline} stats={stats} />
        <Alert severity="info" variant="outlined">
          <AlertTitle>No prices collected yet</AlertTitle>
          The collector for {brand?.name ?? slug} is in place, but it hasn&apos;t stored a snapshot
          yet. Its offers, charts and history appear here as soon as one lands — the nightly run is
          at 02:00.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <BrandHero brand={brand} slug={slug} tagline={tagline} stats={stats} />

      {/* The offers come first: someone opening a brand page is shopping, and
          the analytics below are context for what they find here. */}
      <Box component="section">
        <SectionHeading
          icon={<TableRowsRoundedIcon fontSize="small" />}
          title={`${brand?.name ?? slug} offers`}
          subtitle="Same filters and saved views as the main table. Every row links out to the operator's own page."
        />
        <BrandsTable />
      </Box>

      {/* This operator's own prices and movement. Hides itself for a brand
          whose collector hasn't produced a snapshot yet. */}
      <BrandAnalytics slug={slug} />
    </Stack>
  );
}
