"use client";

import { useMemo } from "react";
import { Paper, Typography, Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { motion } from "framer-motion";
import { useAllOffers, useLatestOffers } from "@/lib/query/usePrices";
import { BRANDS } from "@/lib/brands/config";
import type { OfferStatus, PriceRow } from "@/lib/brands/types";

const STATUS_COLORS: Record<OfferStatus, string> = {
  green: "#1A8A4A",
  orange: "#E08A1E",
  default: "#94A3B8",
};
const STATUS_LABEL: Record<OfferStatus, string> = {
  green: "Best price",
  orange: "Limited",
  default: "Standard",
};

function AnimatedPanel({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

export function StatsSection() {
  const { data: latest } = useLatestOffers();
  const { data: history } = useAllOffers();

  const stats = useMemo(() => {
    const allRows: PriceRow[] = latest?.flatMap((s) => s.data) ?? [];
    const sourcesWithData = (latest ?? []).filter((s) => s.data.length > 0);

    const totalOffers = allRows.length;
    const avgPrice = average(allRows.map((r) => r.priceEur));
    const bestPriceShare = totalOffers > 0 ? (allRows.filter((r) => r.status === "green").length / totalOffers) * 100 : 0;

    // Avg price per resort, priciest first.
    const byResort = new Map<string, number[]>();
    for (const row of allRows) {
      byResort.set(row.resort, [...(byResort.get(row.resort) ?? []), row.priceEur]);
    }
    const avgPriceByResort = [...byResort.entries()]
      .map(([resort, prices]) => ({ resort, avgPrice: Math.round(average(prices)) }))
      .sort((a, b) => b.avgPrice - a.avgPrice);

    // Status breakdown across all current offers.
    const statusBreakdown = (Object.keys(STATUS_LABEL) as OfferStatus[])
      .map((status) => ({ status, count: allRows.filter((r) => r.status === status).length }))
      .filter((s) => s.count > 0);

    // Seasonal curve: avg price per departure date, across every resort, chronological.
    const byDate = new Map<string, number[]>();
    for (const row of allRows) {
      byDate.set(row.date, [...(byDate.get(row.date) ?? []), row.priceEur]);
    }
    const priceByDate = [...byDate.entries()]
      .map(([date, prices]) => ({ date, avgPrice: Math.round(average(prices)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Day-over-day trend: avg price per scrape day, from the full history endpoint.
    const byScrapeDay = new Map<string, number[]>();
    for (const source of history ?? []) {
      for (const day of source.days) {
        byScrapeDay.set(day.day, [...(byScrapeDay.get(day.day) ?? []), ...day.data.map((r) => r.priceEur)]);
      }
    }
    const priceByScrapeDay = [...byScrapeDay.entries()].map(([day, prices]) => ({
      day,
      avgPrice: Math.round(average(prices)),
    }));

    return {
      totalOffers,
      avgPrice,
      bestPriceShare,
      avgPriceByResort,
      statusBreakdown,
      priceByDate,
      priceByScrapeDay,
      brandsOnboarded: sourcesWithData.length,
    };
  }, [latest, history]);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedPanel>
            <StatTile label="Current offers" value={stats.totalOffers.toLocaleString()} />
          </AnimatedPanel>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedPanel delay={0.05}>
            <StatTile label="Avg. price" value={`€${Math.round(stats.avgPrice).toLocaleString()}`} />
          </AnimatedPanel>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedPanel delay={0.1}>
            <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Best-price share
              </Typography>
              <Gauge
                width={110}
                height={90}
                value={stats.bestPriceShare}
                valueMax={100}
                startAngle={-110}
                endAngle={110}
                text={({ value }) => `${Math.round(value ?? 0)}%`}
                sx={{ [`& .${gaugeClasses.valueArc}`]: { fill: STATUS_COLORS.green } }}
              />
            </Paper>
          </AnimatedPanel>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedPanel delay={0.15}>
            <StatTile label="Brands onboarded" value={`${stats.brandsOnboarded} / ${BRANDS.length}`} />
          </AnimatedPanel>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <AnimatedPanel delay={0.1}>
            <Paper sx={{ p: 2, height: 340 }}>
              <Typography variant="subtitle2" gutterBottom>
                Avg. price by resort
              </Typography>
              {stats.avgPriceByResort.length > 0 ? (
                <BarChart
                  dataset={stats.avgPriceByResort}
                  layout="horizontal"
                  yAxis={[{ dataKey: "resort", scaleType: "band" }]}
                  xAxis={[{ label: "€" }]}
                  series={[{ dataKey: "avgPrice", label: "Avg. price (€)", color: "#1B4965" }]}
                  height={280}
                  margin={{ left: 170 }}
                />
              ) : (
                <EmptyChartState />
              )}
            </Paper>
          </AnimatedPanel>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <AnimatedPanel delay={0.2}>
            <Paper sx={{ p: 2, height: 340 }}>
              <Typography variant="subtitle2" gutterBottom>
                Offers by status
              </Typography>
              {stats.statusBreakdown.length > 0 ? (
                <PieChart
                  series={[
                    {
                      data: stats.statusBreakdown.map((s, i) => ({
                        id: i,
                        label: STATUS_LABEL[s.status],
                        value: s.count,
                        color: STATUS_COLORS[s.status],
                      })),
                      innerRadius: 40,
                      paddingAngle: 2,
                      cornerRadius: 4,
                    },
                  ]}
                  height={280}
                />
              ) : (
                <EmptyChartState />
              )}
            </Paper>
          </AnimatedPanel>
        </Grid>
      </Grid>

      <AnimatedPanel delay={0.25}>
        <Paper sx={{ p: 2, height: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            Avg. price by departure date
          </Typography>
          {stats.priceByDate.length > 0 ? (
            <LineChart
              xAxis={[{ scaleType: "point", data: stats.priceByDate.map((d) => d.date), label: "Departure date" }]}
              series={[{ data: stats.priceByDate.map((d) => d.avgPrice), label: "Avg. price (€)", color: "#1B4965", area: true, showMark: false }]}
              height={240}
            />
          ) : (
            <EmptyChartState />
          )}
        </Paper>
      </AnimatedPanel>

      <AnimatedPanel delay={0.3}>
        <Paper sx={{ p: 2, height: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            Avg. price, day over day (fetch-all-offers history)
          </Typography>
          {stats.priceByScrapeDay.length > 1 ? (
            <LineChart
              xAxis={[{ scaleType: "point", data: stats.priceByScrapeDay.map((d) => d.day), label: "Scrape day" }]}
              series={[{ data: stats.priceByScrapeDay.map((d) => d.avgPrice), label: "Avg. price (€)", color: "#E4002B", showMark: true }]}
              height={240}
            />
          ) : (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography color="text.secondary" variant="body2">
                Needs a few more daily refreshes to show a trend
              </Typography>
            </Box>
          )}
        </Paper>
      </AnimatedPanel>
    </Stack>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  );
}

function EmptyChartState() {
  return (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography color="text.secondary" variant="body2">
        No data yet
      </Typography>
    </Box>
  );
}
