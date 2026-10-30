"use client";

import { useMemo } from "react";
import { Box } from "@mui/material";
import { scaleLinear, scalePoint } from "d3-scale";
import { extent } from "d3-array";
import { line, curveLinear } from "d3-shape";
import { motion } from "framer-motion";
import { useAnimatedPath } from "@/shared/charts/hooks/useAnimatedPath";
import { AxisLeft } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { useChartColors, changeColor } from "@/shared/charts/lib/palette";
import { eur, pct, shortDate } from "@/shared/format/formatters";
import type { MarketPoint } from "@/features/analytics/lib/types";

const MARGIN = { top: 16, right: 56, bottom: 40, left: 56 };
const HEIGHT = 240;

interface XY {
  x: number;
  y: number;
}

const lerpXY = (a: XY, b: XY, t: number): XY => {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};

export const MarketIndexLine = ({ points, isFetching }: { points: MarketPoint[]; isFetching: boolean }) => {
  const colors = useChartColors();
  const { ref, width } = useChartDimensions(520);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { linePoints, xScale, yScale, net } = useMemo(() => {
    const values = points.map((p) => p.index);
    const [min = 100, max = 100] = extent(values);
    const centre = (min + max) / 2;
    const halfSpan = Math.max((max - min) / 2, 2.5);

    const x = scalePoint<string>()
      .domain(points.map((p) => p.day))
      .range([0, innerWidth])
      .padding(0.5);
    const y = scaleLinear()
      .domain([centre - halfSpan * 1.3, centre + halfSpan * 1.3])
      .range([innerHeight, 0])
      .nice();

    return {
      linePoints: points.map((p) => ({ x: x(p.day) ?? 0, y: y(p.index) })),
      xScale: x,
      yScale: y,
      net: points.length > 0 ? points[points.length - 1].index - 100 : 0,
    };
  }, [points, innerWidth, innerHeight]);

  const buildPath = useMemo(
    () =>
      (pts: XY[]) =>
        line<XY>()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(curveLinear)(pts) ?? "",
    []
  );
  const path = useAnimatedPath<XY>(linePoints, buildPath, lerpXY, {
    seed: (pts) => pts.map((p) => ({ x: p.x, y: innerHeight })),
  });

  const tableColumns: TableColumn<MarketPoint>[] = [
    { header: "Snapshot", render: (p) => shortDate(p.day) },
    { header: "Index", numeric: true, render: (p) => p.index.toFixed(2) },
    { header: "Offers", numeric: true, render: (p) => p.n },
    { header: "Matched", numeric: true, render: (p) => p.nMatched },
    { header: "Mean price", numeric: true, render: (p) => (p.meanAll ? eur(p.meanAll) : "—") },
  ];

  return (
    <ChartCard
      title="Are prices going up or down?"
      subtitle={
        points.length < 2
          ? "Too early to say — we need a few more nights"
          : `Average change across the weeks we track, against ${shortDate(points[0].day)} · now ${pct(net, 2)}. Only weeks on sale on both nights count.`
      }
      isEmpty={points.length < 2}
      emptyMessage="Too early to say — come back once we've compared a few more nights"
      isFetching={isFetching}
      tableRows={points}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg width="100%" height={HEIGHT} role="img" aria-label="Matched-basket price index by snapshot day">
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <AxisLeft scale={yScale} width={innerWidth} tickCount={4} format={(v) => v.toFixed(1)} />

            <line
              x1={0}
              x2={innerWidth}
              y1={yScale(100)}
              y2={yScale(100)}
              stroke={colors.axis}
              strokeWidth={1}
            />

            <motion.path d={path} fill="none" stroke={changeColor(net, colors)} strokeWidth={2} strokeLinecap="round" />

            {points.map((point) => (
              <g key={point.day}>
                <circle
                  cx={xScale(point.day) ?? 0}
                  cy={yScale(point.index)}
                  r={4}
                  fill={changeColor(net, colors)}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
                <title>
                  {shortDate(point.day)}: index {point.index.toFixed(2)}, {point.nMatched} matched offers
                </title>
                <text
                  x={xScale(point.day) ?? 0}
                  y={innerHeight + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill={colors.muted}
                >
                  {shortDate(point.day)}
                </text>
              </g>
            ))}

            <text
              x={innerWidth + 8}
              y={yScale(points[points.length - 1]?.index ?? 100)}
              dy="0.32em"
              fontSize={12}
              fontWeight={600}
              fill={changeColor(net, colors)}
            >
              {pct(net, 1)}
            </text>
          </g>
        </svg>
      </Box>
    </ChartCard>
  );
};
