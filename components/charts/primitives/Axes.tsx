"use client";

import type { ScaleBand, ScaleLinear, ScaleTime } from "d3-scale";
import { CHART_COLORS } from "@/lib/charts/palette";

/** `fontVariantNumeric` is a style, not an SVG attribute — spreading it as a
 *  prop makes React warn and the browser ignore it. */
const TICK_STYLE = {
  fill: CHART_COLORS.muted,
  fontSize: 11,
  style: { fontVariantNumeric: "tabular-nums" as const },
};

/**
 * Axes are hand-rolled rather than handed to d3-axis: d3-axis works through
 * selections, which would mutate DOM React owns (and double-render under React
 * 19 Strict Mode). scale.ticks() gives the numbers; the rest is a map.
 */
export function AxisBottom({
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
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticks = (scale as any).ticks(tickCount) as never[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackFormat = (scale as any).tickFormat(tickCount) as (value: never) => string;
  const formatter = format ?? fallbackFormat;

  return (
    <g>
      <line x1={0} x2={width} y1={y} y2={y} stroke={CHART_COLORS.axis} strokeWidth={1} />
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
        <text x={width / 2} y={y + 34} textAnchor="middle" fill={CHART_COLORS.inkSecondary} fontSize={11}>
          {label}
        </text>
      )}
    </g>
  );
}

export function AxisLeft({
  scale,
  width,
  tickCount = 5,
  format,
}: {
  scale: ScaleLinear<number, number>;
  width: number;
  tickCount?: number;
  format?: (value: number) => string;
}) {
  const ticks = scale.ticks(tickCount);
  const formatter = format ?? scale.tickFormat(tickCount);

  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0, ${scale(tick)})`}>
          {/* Solid hairline grid — dashes read as "threshold" when they're just a grid. */}
          <line x1={0} x2={width} stroke={CHART_COLORS.grid} strokeWidth={1} />
          <text x={-8} dy="0.32em" textAnchor="end" {...TICK_STYLE}>
            {formatter(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function AxisLeftBand({
  scale,
  labels,
  maxChars = 26,
}: {
  scale: ScaleBand<string>;
  /** Domain values are stable ids; this maps each one to what the reader sees. */
  labels?: Map<string, string>;
  maxChars?: number;
}) {
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
          fill={CHART_COLORS.inkSecondary}
          fontSize={11}
        >
          {truncate(labels?.get(value) ?? value, maxChars)}
        </text>
      ))}
    </g>
  );
}

function truncate(text: string, maxChars: number): string {
  const bare = text.replace(/[⁨⁩]/g, "");
  return bare.length > maxChars ? `${bare.slice(0, maxChars - 1)}…` : text;
}
