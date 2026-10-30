"use client";

import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { scaleBand, scaleLinear } from "d3-scale";
import { max as d3max } from "d3-array";
import { motion } from "framer-motion";
import { AxisBottom, AxisLeftBand } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { ChartTooltip, type TooltipState } from "@/shared/charts/components/ChartTooltip";
import { AnimatedNumber } from "@/shared/charts/components/AnimatedNumber";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { useChartColors } from "@/shared/charts/lib/palette";
import { COLORS } from "@/shared/design/tokens";
import { bidi, eur, shortDate } from "@/shared/format/formatters";
import { getBrand } from "@/features/brands/constants";
import type { ResortLevel } from "@/features/analytics/lib/homeModel";

const MARGIN = { top: 10, right: 134, bottom: 44, left: 128 };
const ROW_HEIGHT = 38;

const asEur = (value: number) => eur(value);

const operatorName = (source: string) => getBrand(source)?.name ?? source;

export const CheapestResorts = ({
  levels,
  isFetching,
}: {
  levels: ResortLevel[];
  isFetching: boolean;
}) => {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(760);
  const { move, stagger } = useChartMotion();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = Math.max(levels.length * ROW_HEIGHT, 1);
  const height = innerHeight + MARGIN.top + MARGIN.bottom;

  const { xScale, yScale, labels } = useMemo(() => {
    const top = d3max(levels, (l) => l.typicalPerNight) ?? 1;

    return {
      xScale: scaleLinear().domain([0, top * 1.05]).range([0, innerWidth]).nice(),
      yScale: scaleBand<string>()
        .domain(levels.map((l) => l.resort))
        .range([0, innerHeight])
        .padding(0.34),
      labels: new Map(levels.map((l) => [l.resort, bidi(l.resort)])),
    };
  }, [levels, innerWidth, innerHeight]);

  const best = levels[0] ?? null;

  const tableColumns: TableColumn<ResortLevel>[] = [
    { header: "Resort", render: (l) => l.resort },
    { header: "Country", render: (l) => bidi(l.country) },
    { header: "Operator", render: (l) => operatorName(l.cheapest.source) },
    { header: "Departs", render: (l) => shortDate(l.cheapest.departure) },
    { header: "Nights", numeric: true, render: (l) => l.cheapest.nights },
    { header: "Cheapest total", numeric: true, render: (l) => eur(l.cheapest.total) },
    { header: "Per night", numeric: true, render: (l) => eur(l.cheapestPerNight) },
    { header: "Typical / night", numeric: true, render: (l) => eur(l.typicalPerNight) },
    { header: "Offers", numeric: true, render: (l) => l.n },
  ];

  return (
    <ChartCard
      title="Where a ski week is cheapest right now"
      subtitle="Each bar runs from a resort's cheapest booking to its typical one, priced per night on the whole booking so a long weekend can't look cheap just for being short."
      isEmpty={levels.length === 0}
      emptyMessage="No offers match these filters."
      isFetching={isFetching}
      tableRows={levels}
      tableColumns={tableColumns}
    >
      {best && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.5, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "baseline" }}
          sx={{
            mb: 2,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: COLORS.frost,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h4" fontWeight={800} sx={{ color: colors.brand, lineHeight: 1.1 }}>
            <AnimatedNumber value={best.cheapest.total} format={asEur} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            cheapest booking on the board — {bidi(best.resort)}, {best.cheapest.nights} nights from{" "}
            {shortDate(best.cheapest.departure)} with{" "}
            {operatorName(best.cheapest.source)}
            {best.cheapest.pax ? `, total for ${best.cheapest.pax}` : ""}
          </Typography>
        </Stack>
      )}

      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          width="100%"
          height={height}
          role="img"
          aria-label={`Cheapest resorts right now, ${levels.length} resorts`}
        >
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeftBand scale={yScale} labels={labels} maxChars={16} />

            {levels.map((level, i) => {
              const y = (yScale(level.resort) ?? 0) + yScale.bandwidth() / 2;
              const from = xScale(level.cheapestPerNight);
              const to = xScale(level.typicalPerNight);
              const bandHeight = Math.min(yScale.bandwidth(), 16);
              const isBest = i === 0;

              return (
                <g
                  key={level.resort}
                  onMouseEnter={() =>
                    setTooltip({
                      x: to,
                      y: y + MARGIN.top,
                      content: (
                        <>
                          <strong>{bidi(level.resort)}</strong> · {bidi(level.country)}
                          <br />
                          Cheapest: <strong>{eur(level.cheapest.total)}</strong> total for{" "}
                          {level.cheapest.nights} nights
                          <br />
                          {operatorName(level.cheapest.source)} · departs{" "}
                          {shortDate(level.cheapest.departure)}
                          {level.cheapest.hotel ? (
                            <>
                              <br />
                              {bidi(level.cheapest.hotel)}
                            </>
                          ) : null}
                          <br />
                          <span style={{ color: colors.inkSecondary }}>
                            {eur(level.cheapestPerNight)}/night, typical here{" "}
                            {eur(level.typicalPerNight)}/night · {level.n} offers
                          </span>
                        </>
                      ),
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={0}
                    y={y - ROW_HEIGHT / 2}
                    width={innerWidth}
                    height={ROW_HEIGHT}
                    fill="transparent"
                  />

                  <motion.rect
                    x={from}
                    y={y - bandHeight / 2}
                    height={bandHeight}
                    rx={bandHeight / 2}
                    initial={{ width: 0 }}
                    animate={{ width: Math.max(to - from, bandHeight) }}
                    transition={move(stagger(i))}
                    fill={COLORS.ice}
                  />

                  <motion.circle
                    cy={y}
                    initial={{ cx: 0, opacity: 0 }}
                    animate={{ cx: from, opacity: 1 }}
                    transition={move(stagger(i))}
                    r={isBest ? 7 : 5.5}
                    fill={isBest ? COLORS.accent : colors.brand}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />

                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={move(stagger(i) + 0.12)}
                    x={innerWidth + 10}
                    y={y}
                    dy="0.32em"
                    fontSize={12.5}
                    fontWeight={isBest ? 800 : 600}
                    fill={isBest ? COLORS.accent : colors.ink}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {eur(level.cheapest.total)}
                  </motion.text>
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={move(stagger(i) + 0.12)}
                    x={innerWidth + 10}
                    y={y + 14}
                    fontSize={10.5}
                    fill={colors.muted}
                  >
                    {level.cheapest.nights} nights
                  </motion.text>
                </g>
              );
            })}

            <AxisBottom
              scale={xScale}
              width={innerWidth}
              y={innerHeight}
              tickCount={innerWidth < 420 ? 3 : 5}
              format={((v: number) => eur(v)) as never}
              label="Total booking cost, per night"
            />
          </g>
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </Box>
    </ChartCard>
  );
};
