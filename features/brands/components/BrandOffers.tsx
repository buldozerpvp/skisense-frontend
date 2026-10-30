"use client";

import { Box, Stack } from "@mui/material";
import { useEffect, useMemo } from "react";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import { Alert, AlertTitle } from "@mui/material";
import { useLatestOffers } from "@/features/prices/hooks/usePrices";
import { OffersTable } from "@/features/offers/components/OffersTable";
import { SectionHeading } from "@/features/app-shell/components/SectionHeading";
import { useOffersBrowsing } from "@/features/offers/hooks/useOffersBrowsing";
import { getBrand } from "@/features/brands/constants";
import { BrandAnalytics } from "@/features/analytics/components/BrandAnalytics";
import { BrandHero, type BrandStat } from "@/features/brands/components/BrandHero";

export const BrandOffers = ({ slug, tagline }: { slug: string; tagline?: string }) => {
  const brand = getBrand(slug);
  const { data, isLoading } = useLatestOffers();
  const source = useMemo(() => data?.find((s) => s.source === slug), [data, slug]);
  const setSelectedBrands = useOffersBrowsing((s) => s.setSelectedBrands);

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

      <Box component="section">
        <SectionHeading
          icon={<TableRowsRoundedIcon fontSize="small" />}
          title={`${brand?.name ?? slug} offers`}
          subtitle="Same filters and saved views as the main table. Every row links out to the operator's own page."
        />
        <OffersTable />
      </Box>

      <BrandAnalytics slug={slug} />
    </Stack>
  );
};
