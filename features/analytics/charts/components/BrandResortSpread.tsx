"use client";

import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { scaleBand, scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeftBand } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { ChartTooltip, type TooltipState } from "@/shared/charts/components/ChartTooltip";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { useChartColors } from "@/shared/charts/lib/palette";
import { bidi, eur, shortDate } from "@/shared/format/formatters";
import { getBrand } from "@/features/brands/constants";
import type { ResortSpread } from "@/features/analytics/lib/brandModel";

const MARGIN = { top: 12, right: 92, bottom: 48, left: 184 };
const ROW_HEIGHT = 30;
const DEFAULT_WIDTH = 760;

export const BrandResortSpread = ({
  spreads,
  slug,
  isFetching,
  snapshotDay,
}: {
  spreads: ResortSpread[];
  slug: string;
  isFetching: boolean;
  snapshotDay?: string | null;
}) => {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(DEFAULT_WIDTH);
  const { move, stagger } = useChartMotion();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const brand = getBrand(slug);
  const accent = brand?.color ?? colors.brand;

  const innerWidth = Math.max(DEFAULT_WIDTH - MARGIN.left - MARGIN.right, 10);
  const scaleToCss = width / DEFAULT_WIDTH;
  const innerHeight = Math.max(spreads.length * ROW_HEIGHT, ROW_HEIGHT);
  const height = innerHeight + MARGIN.top + MARGIN.bottom;

  const { xScale, yScale, typical, departures, singles } = useMemo(() => {
    const values = spreads.flatMap((s) => [s.min, s.max]);
    const [min = 0, max = 1] = extent(values);
    const pad = (max - min) * 0.1 || Math.max(max * 0.1, 10);

    const medians = spreads.map((s) => s.median).sort((a, b) => a - b);
    const mid = Math.floor(medians.length / 2);

    return {
      xScale: scaleLinear()
        .domain([Math.max(0, min - pad), max + pad])
        .range([0, innerWidth])
        .nice(),
      yScale: scaleBand<string>()
        .domain(spreads.map((s) => s.key))
        .range([0, innerHeight])
        .padding(0.3),
      typical:
        medians.length === 0
          ? 0
          : medians.length % 2 === 1
            ? medians[mid]
            : (medians[mid - 1] + medians[mid]) / 2,
      departures: spreads.reduce((sum, s) => sum + s.count, 0),
      singles: spreads.filter((s) => s.count === 1).length,
    };
  }, [spreads, innerWidth, innerHeight]);

  const rowLabels = useMemo(
    () => new Map(spreads.map((s) => [s.key, bidi(s.resort)])),
    [spreads]
  );

  const tableColumns: TableColumn<ResortSpread>[] = [
    { header: "Resort", render: (s) => s.resort },
    { header: "Country", render: (s) => s.country },
    { header: "Departures", numeric: true, render: (s) => s.count },
    { header: "Cheapest /night", numeric: true, render: (s) => eur(s.min) },
    { header: "Typical /night", numeric: true, render: (s) => eur(s.median) },
    { header: "Priciest /night", numeric: true, render: (s) => eur(s.max) },
    {
      header: "Cheapest week",
      render: (s) => `${shortDate(s.cheapest.date)} · ${eur(s.cheapest.priceEur)} / ${s.cheapestNights}n`,
    },
  ];

  const operator = brand?.name ?? slug;

  return (
    <ChartCard
      title={`Where ${operator} is affordable`}
      subtitle={`One line per resort, from its cheapest departure to its priciest; the dot is the typical week. Priced per person per night across ${departures} departures${
        snapshotDay ? ` on ${shortDate(snapshotDay)}` : ""
      }, so short breaks and full weeks compare. Cheapest resort at the top.${
        singles > 0 ? " A hollow dot means we only have one departure priced there, so there's no range yet." : ""
      }`}
      isEmpty={spreads.length === 0}
      emptyMessage={`No priced departures for ${operator} with a stay length we can compare.`}
      isFetching={isFetching}
      tableRows={spreads}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${DEFAULT_WIDTH} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", maxWidth: 1040, height: "auto", margin: "0 auto" }}
          role="img"
          aria-label={`Price per night by resort for ${operator}, ${spreads.length} resorts`}
        >
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeftBand scale={yScale} labels={rowLabels} maxChars={28} />

            <line
              x1={xScale(typical)}
              x2={xScale(typical)}
              y1={0}
              y2={innerHeight}
              stroke={colors.muted}
              strokeWidth={1}
              strokeDasharray="4 3"
            />

            {spreads.map((spread, i) => {
              const y = (yScale(spread.key) ?? 0) + yScale.bandwidth() / 2;
              const from = xScale(spread.min);
              const to = xScale(spread.max);
              const mid = xScale(spread.median);
              const delay = stagger(i);
              const single = spread.count === 1;

              return (
                <g
                  key={spread.key}
                  onMouseEnter={() =>
                    setTooltip({
                      x: (mid + MARGIN.left) * scaleToCss,
                      y: (y + MARGIN.top) * scaleToCss,
                      content: (
                        <>
                          <strong>{bidi(spread.resort)}</strong>
                          <br />
                          {bidi(spread.country)} · {spread.count}{" "}
                          {spread.count === 1 ? "departure" : "departures"}
                          <br />
                          <strong>{eur(spread.median)}</strong>/night typical
                          <br />
                          {eur(spread.min)} – {eur(spread.max)} per night
                          <br />
                          <span style={{ color: colors.inkSecondary }}>
                            Cheapest: {shortDate(spread.cheapest.date)} ·{" "}
                            {eur(spread.cheapest.priceEur)} for {spread.cheapestNights} nights
                          </span>
                        </>
                      ),
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect x={0} y={y - ROW_HEIGHT / 2} width={innerWidth} height={ROW_HEIGHT} fill="transparent" />

                  <motion.line
                    x1={from}
                    y1={y}
                    y2={y}
                    initial={{ x2: from }}
                    animate={{ x2: to }}
                    transition={move(delay)}
                    stroke={colors.neutral}
                    strokeWidth={single ? 0 : 3}
                    strokeOpacity={0.45}
                    strokeLinecap="round"
                  />
                  {!single && (
                    <>
                      <line
                        x1={from}
                        x2={from}
                        y1={y - 5}
                        y2={y + 5}
                        stroke={colors.neutral}
                        strokeWidth={1.5}
                      />
                      <motion.line
                        y1={y - 5}
                        y2={y + 5}
                        initial={{ x1: from, x2: from }}
                        animate={{ x1: to, x2: to }}
                        transition={move(delay)}
                        stroke={colors.neutral}
                        strokeWidth={1.5}
                      />
                    </>
                  )}

                  <motion.circle
                    cy={y}
                    initial={{ cx: from }}
                    animate={{ cx: mid }}
                    transition={move(delay)}
                    r={5.5}
                    fill={single ? colors.surface : accent}
                    stroke={single ? accent : colors.surface}
                    strokeWidth={2}
                  />

                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={move(delay)}
                    x={innerWidth + 8}
                    y={y}
                    dy="0.32em"
                    fontSize={12}
                    fontWeight={600}
                    fill={colors.ink}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {eur(spread.median)}
                  </motion.text>
                </g>
              );
            })}

            <AxisBottom
              scale={xScale}
              width={innerWidth}
              y={innerHeight}
              tickCount={6}
              format={((v: number) => eur(v)) as never}
              label="Price per person per night"
            />
            <text x={xScale(typical)} y={-1} textAnchor="middle" fontSize={11} fill={colors.muted}>
              typical resort {eur(typical)}
            </text>
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
};
