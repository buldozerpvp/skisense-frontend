"use client";

import type { ScaleBand, ScaleLinear, ScaleTime } from "d3-scale";
import { useChartColors, type ChartColors } from "@/lib/charts/palette";

/** `fontVariantNumeric` is a style, not an SVG attribute — spreading it as a
 *  prop makes React warn and the browser ignore it. */
function tickStyle(colors: ChartColors) {
  return {
    fill: colors.muted,
    fontSize: 11,
    style: { fontVariantNumeric: "tabular-nums" as const },
  };
}

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
}

/**
 * Value axis for the horizontal-bar charts. The tick labels sit outside the
 * plot while their lines run right across it, so a bar can be read off the grid
 * without the eye travelling back to a single edge.
 */
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
  const colors = useChartColors();
  const TICK_STYLE = tickStyle(colors);
  const ticks = scale.ticks(tickCount);
  const formatter = format ?? scale.tickFormat(tickCount);

  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0, ${scale(tick)})`}>
          {/* Solid hairline grid — dashes read as "threshold" when they're just a grid. */}
          <line x1={0} x2={width} stroke={colors.grid} strokeWidth={1} />
          <text x={-8} dy="0.32em" textAnchor="end" {...TICK_STYLE}>
            {formatter(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

/**
 * Categorical axis for the row charts. The band domain holds stable offer or
 * resort keys rather than display names — that is what keeps a row's position
 * and its React key attached to the same offer across a filter change — so the
 * human label has to be looked up through `labels`.
 */
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
}

// Length is measured on the bare text so the invisible bidi isolates that
// bidi() wraps right-to-left resort names in don't eat into the character
// budget. A label that fits is returned untouched, isolates and all, so the
// wrapper survives wherever it still has room.
function truncate(text: string, maxChars: number): string {
  const bare = text.replace(/[⁨⁩]/g, "");
  return bare.length > maxChars ? `${bare.slice(0, maxChars - 1)}…` : text;
}
