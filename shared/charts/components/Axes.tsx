"use client";

import type { ScaleBand, ScaleLinear, ScaleTime } from "d3-scale";
import { useChartColors, type ChartColors } from "@/shared/charts/lib/palette";

const tickStyle = (colors: ChartColors) => {
  return {
    fill: colors.muted,
    fontSize: 11,
    style: { fontVariantNumeric: "tabular-nums" as const },
  };
};

export const AxisBottom = ({
  scale,
  width,
  y,
  tickCount = 6,
  format,
  label,
}: {
  scale: ScaleLinear<number, number> | ScaleTime<number, number>;
  width: number;
  y: number;
  tickCount?: number;
  format?: (value: never) => string;
  label?: string;
}) => {
  const colors = useChartColors();
  const TICK_STYLE = tickStyle(colors);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticks = (scale as any).ticks(tickCount) as never[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackFormat = (scale as any).tickFormat(tickCount) as (value: never) => string;
  const formatter = format ?? fallbackFormat;

  return (
    <g>
      <line x1={0} x2={width} y1={y} y2={y} stroke={colors.axis} strokeWidth={1} />
      {ticks.map((tick, i) => (
        <text
          key={i}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          x={(scale as any)(tick)}
          y={y + 16}
          textAnchor="middle"
          {...TICK_STYLE}
        >
          {formatter(tick)}
        </text>
      ))}
      {label && (
        <text x={width / 2} y={y + 34} textAnchor="middle" fill={colors.inkSecondary} fontSize={11}>
          {label}
        </text>
      )}
    </g>
  );
};

export const AxisLeft = ({
  scale,
  width,
  tickCount = 5,
  format,
}: {
  scale: ScaleLinear<number, number>;
  width: number;
  tickCount?: number;
  format?: (value: number) => string;
}) => {
  const colors = useChartColors();
  const TICK_STYLE = tickStyle(colors);
  const ticks = scale.ticks(tickCount);
  const formatter = format ?? scale.tickFormat(tickCount);

  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0, ${scale(tick)})`}>
          <line x1={0} x2={width} stroke={colors.grid} strokeWidth={1} />
          <text x={-8} dy="0.32em" textAnchor="end" {...TICK_STYLE}>
            {formatter(tick)}
          </text>
        </g>
      ))}
    </g>
  );
};

export const AxisLeftBand = ({
  scale,
  labels,
  maxChars = 26,
}: {
  scale: ScaleBand<string>;
  labels?: Map<string, string>;
  maxChars?: number;
}) => {
  const colors = useChartColors();
  const offset = scale.bandwidth() / 2;
  return (
    <g>
      {scale.domain().map((value) => (
        <text
          key={value}
          x={-8}
          y={(scale(value) ?? 0) + offset}
          dy="0.32em"
          textAnchor="end"
          fill={colors.inkSecondary}
          fontSize={11}
        >
          {truncate(labels?.get(value) ?? value, maxChars)}
        </text>
      ))}
    </g>
  );
};

const truncate = (text: string, maxChars: number): string => {
  const bare = text.replace(/[⁨⁩]/g, "");
  return bare.length > maxChars ? `${bare.slice(0, maxChars - 1)}…` : text;
};
