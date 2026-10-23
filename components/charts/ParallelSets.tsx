"use client";

import { useMemo, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ChartCard, type TableColumn } from "./primitives/ChartCard";
import { ChartTooltip, type TooltipState } from "./primitives/ChartTooltip";
import { useChartDimensions } from "@/lib/charts/useChartDimensions";
import { useChartMotion, type ChartMotion } from "@/lib/charts/useChartMotion";
import { useAnimatedPath } from "@/lib/charts/useAnimatedPath";
import { CHART_COLORS } from "@/lib/charts/palette";
import { eur, truncateLabel } from "@/lib/analytics/format";
import type { SourcedRow } from "@/lib/analytics/derive";
import {
  DEFAULT_DIMENSIONS,
  buildParallelSets,
  lerpSegment,
  layoutParallelSets,
  operatorColor,
  operatorName,
  ribbonPathAll,
  seedSegments,
  type PsDimensionId,
  type PsNodeLayout,
  type PsRibbon,
  type PsRibbonLayout,
  type PsSegment,
  type PsSelection,
} from "@/lib/analytics/parallelSets";

const MARGIN = { top: 30, right: 10, bottom: 10, left: 10 };
const DEFAULT_HEIGHT = 440;
const NODE_WIDTH = 10;
/** Rough advance width of the 11px label face — good enough to decide truncation. */
const CHAR_WIDTH = 6.1;
const DIM_OPACITY = 0.12;
/** Minimum vertical distance between two drawn category labels. */
const MIN_LABEL_GAP = 12;

export interface ParallelSetsProps {
  rows: SourcedRow[];
  isFetching?: boolean;
  /** Axes, left to right. Defaults to operator → country → stay length → price band. */
  dimensions?: PsDimensionId[];
  /** Quantile price bands. Four (quartiles) by default. */
  bandCount?: number;
  height?: number;
  /** Fired when a category bar is clicked. Unwired here — the caller owns filter state. */
  onSelect?: (selection: PsSelection) => void;
}

type Hover =
  | { kind: "ribbon"; key: string }
  | { kind: "node"; axis: number; value: string }
  | null;

/**
 * Parallel sets: every current offer flowing left to right across ordered
 * categorical axes, one ribbon per distinct combination, thickness = offers.
 *
 * The question is "who sells what, where, and at what price level" — a shopper
 * should see in one glance that one operator owns the cheap Bulgaria end while
 * another is all expensive France. Stacked bars would answer that one axis at a
 * time and lose the joint distribution, which is the whole point: it is the
 * *path* through the axes that names a market position.
 *
 * Price bands come from quantiles of price per person per night, never package
 * price — a 3-night break and a full week are not comparable on totals.
 */
export function ParallelSets({
  rows,
  isFetching = false,
  dimensions = DEFAULT_DIMENSIONS,
  bandCount = 4,
  height = DEFAULT_HEIGHT,
  onSelect,
}: ParallelSetsProps) {
  const { ref, width } = useChartDimensions(900);
  const motionSpec = useChartMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 10);

  const model = useMemo(
    () => buildParallelSets(rows, dimensions, { bandCount }),
    [rows, dimensions, bandCount],
  );

  const layout = useMemo(
    () =>
      layoutParallelSets(model, {
        width: innerWidth,
        height: innerHeight,
        nodeWidth: NODE_WIDTH,
        // Tighter gaps on a narrow card, or a busy axis spends its height on air.
        nodePadding: innerWidth < 620 ? 8 : 12,
      }),
    [model, innerWidth, innerHeight],
  );

  const axisCount = layout.axes.length;
  const gap =
    axisCount > 1
      ? (innerWidth - NODE_WIDTH) / (axisCount - 1) - NODE_WIDTH
      : innerWidth;
  const labelMax = Math.max(
    6,
    Math.min(30, Math.floor((gap - 14) / CHAR_WIDTH)),
  );

  /**
   * Which category labels get drawn: walking each axis top to bottom and
   * skipping any whose label would overprint the one above it. A fixed
   * minimum-band-height rule would silently drop every small operator at once —
   * this keeps whichever ones actually fit, and the rest stay reachable through
   * the tooltip and the table.
   */
  const labelled = useMemo(() => {
    const keys = new Set<string>();
    layout.axes.forEach((axis, a) => {
      let lastY = -Infinity;
      for (const node of axis.nodes) {
        const centre = (node.y0 + node.y1) / 2;
        if (centre - lastY < MIN_LABEL_GAP) continue;
        keys.add(`${a}|${node.value}`);
        lastY = centre;
      }
    });
    return keys;
  }, [layout.axes]);

  /** Which ribbons are lit. Empty set = nothing hovered, so everything is lit. */
  const activeRibbons = useMemo(() => {
    if (!hover) return null;
    if (hover.kind === "ribbon") return new Set([hover.key]);
    const keys = new Set<string>();
    for (const { ribbon } of layout.ribbons) {
      if (ribbon.values[hover.axis] === hover.value) keys.add(ribbon.key);
    }
    return keys;
  }, [hover, layout.ribbons]);

  const operators = useMemo(() => {
    const seen = new Map<string, number>();
    for (const { ribbon } of layout.ribbons) {
      seen.set(
        ribbon.operator,
        (seen.get(ribbon.operator) ?? 0) + ribbon.count,
      );
    }
    return [...seen].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
  }, [layout.ribbons]);

  function pointerPosition(event: React.MouseEvent): { x: number; y: number } {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function showRibbonTooltip(event: React.MouseEvent, ribbon: PsRibbon) {
    const { x, y } = pointerPosition(event);
    setTooltip({
      x,
      y,
      content: (
        <>
          <Box sx={{ whiteSpace: "normal" }}>
            {ribbon.labels.map((label, i) => (
              <span key={model.axes[i]?.id ?? i}>
                {i > 0 && (
                  <span style={{ color: CHART_COLORS.muted }}> → </span>
                )}
                <strong>{label}</strong>
              </span>
            ))}
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <span style={{ color: ribbon.color }}>■</span>{" "}
            {operatorName(ribbon.operator)}
            <br />
            <strong>{ribbon.count}</strong>{" "}
            {ribbon.count === 1 ? "offer" : "offers"} · {sharePct(ribbon.share)}{" "}
            of all
            <br />
            typically <strong>{eur(ribbon.medianPerNight)}</strong>/night
          </Box>
        </>
      ),
    });
  }

  function showNodeTooltip(
    event: React.MouseEvent,
    node: PsNodeLayout,
    axisTitle: string,
  ) {
    const { x, y } = pointerPosition(event);
    setTooltip({
      x,
      y,
      content: (
        <>
          <span style={{ color: CHART_COLORS.inkSecondary }}>{axisTitle}</span>
          <br />
          <strong>{node.label}</strong>
          <br />
          <strong>{node.count}</strong> {node.count === 1 ? "offer" : "offers"}{" "}
          · {sharePct(node.share)} of all
          {onSelect && (
            <>
              <br />
              <span style={{ color: CHART_COLORS.muted }}>click to filter</span>
            </>
          )}
        </>
      ),
    });
  }

  function clearHover() {
    setHover(null);
    setTooltip(null);
  }

  const tableRows = useMemo(
    () => model.ribbons.slice().sort((a, b) => b.count - a.count),
    [model.ribbons],
  );

  const tableColumns: TableColumn<PsRibbon>[] = [
    ...model.axes.map((axis, i) => ({
      header: axis.title,
      render: (r: PsRibbon) => r.labels[i] ?? "—",
    })),
    { header: "Offers", numeric: true, render: (r: PsRibbon) => r.count },
    {
      header: "Share",
      numeric: true,
      render: (r: PsRibbon) => sharePct(r.share),
    },
    {
      header: "Median /night",
      numeric: true,
      render: (r: PsRibbon) => eur(r.medianPerNight),
    },
  ];

  const bandSummary =
    model.bands.length > 1
      ? `Price bands are quantiles of price per person per night (${model.bands
          .map((b) => b.name)
          .join(", ")}).`
      : "";

  /*
   * Note: ChartCard's own `isEmpty` is not used here, and that is on purpose.
   * It unmounts the children, and on the first paint the offers are still
   * loading — so the measured Box would not exist when the ResizeObserver in
   * useChartDimensions goes looking for it (that effect runs once, with an
   * empty dependency list, and never retries). The chart would then stay stuck
   * at its fallback width for the rest of the session. Keeping the Box mounted
   * and branching inside it costs one `if` and makes the chart actually
   * resize. The same latent bug freezes the other charts on the page; worth
   * fixing in the hook rather than here, but the hook isn't ours to change.
   */
  return (
    <ChartCard
      title="Who sells what, where, and at what price"
      subtitle={`Read left to right: each ribbon is one group of offers, and how thick it is, is how many. Colour is the operator. ${bandSummary}${
        model.dropped > 0
          ? ` ${model.dropped} offers excluded — no stay length recorded.`
          : ""
      }`}
      isFetching={isFetching}
      tableRows={tableRows}
      tableColumns={tableColumns}
    >
      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        {model.total === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No offers with a known stay length yet
            </Typography>
          </Box>
        ) : (
          <>
            {/* Colour is identity here, so it has to be decodable without hovering. */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ mb: 1, flexWrap: "wrap", rowGap: 0.5 }}
            >
              {operators.map((slug) => (
                <Stack
                  key={slug}
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: 0.5,
                      bgcolor: operatorColor(slug),
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {operatorName(slug)}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Box ref={containerRef} sx={{ position: "relative" }}>
              <svg
                width="100%"
                height={height}
                role="img"
                aria-label={`${model.total} offers grouped by ${model.axes
                  .map((a) => a.title.toLowerCase())
                  .join(", then ")}`}
                onMouseLeave={clearHover}
              >
                <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
                  {/* Axis headers. The reference frame — never animated. */}
                  {layout.axes.map((axis, a) => {
                    const last = a === axisCount - 1;
                    return (
                      <text
                        key={axis.id}
                        x={last ? axis.x + NODE_WIDTH : axis.x}
                        y={-14}
                        textAnchor={last ? "end" : "start"}
                        fontSize={11}
                        fontWeight={600}
                        fill={CHART_COLORS.inkSecondary}
                      >
                        {axis.title.toUpperCase()}
                      </text>
                    );
                  })}

                  <g>
                    {layout.ribbons.map((entry) => (
                      <Ribbon
                        key={entry.ribbon.key}
                        entry={entry}
                        motionSpec={motionSpec}
                        dimmed={
                          activeRibbons !== null &&
                          !activeRibbons.has(entry.ribbon.key)
                        }
                        onEnter={(event) => {
                          setHover({ kind: "ribbon", key: entry.ribbon.key });
                          showRibbonTooltip(event, entry.ribbon);
                        }}
                        onMove={(event) =>
                          showRibbonTooltip(event, entry.ribbon)
                        }
                        onLeave={clearHover}
                      />
                    ))}
                  </g>

                  {/* Node bars sit over the ribbons: they are where the reader lands. */}
                  {layout.axes.map((axis, a) => {
                    const last = a === axisCount - 1;
                    return (
                      <g key={axis.id}>
                        {axis.nodes.map((node, i) => {
                          const barHeight = Math.max(node.y1 - node.y0, 1.5);
                          const lit =
                            hover?.kind === "node" &&
                            hover.axis === a &&
                            hover.value === node.value;
                          return (
                            <g
                              key={node.value}
                              onMouseEnter={(event) => {
                                setHover({
                                  kind: "node",
                                  axis: a,
                                  value: node.value,
                                });
                                showNodeTooltip(event, node, axis.title);
                              }}
                              onMouseMove={(event) =>
                                showNodeTooltip(event, node, axis.title)
                              }
                              onMouseLeave={clearHover}
                              onClick={() =>
                                onSelect?.({
                                  dimension: axis.id,
                                  value: node.value,
                                  label: node.label,
                                })
                              }
                              style={{
                                cursor: onSelect ? "pointer" : "default",
                              }}
                            >
                              {/* An attribute in `animate` is never also a static
                              prop — framer owns it, and React's value would be
                              silently ignored. */}
                              <motion.rect
                                x={node.x}
                                width={NODE_WIDTH}
                                rx={2}
                                initial={{
                                  y: (node.y0 + node.y1) / 2,
                                  height: 0,
                                  opacity: 0,
                                }}
                                animate={{
                                  y: node.y0,
                                  height: barHeight,
                                  opacity: 1,
                                }}
                                transition={motionSpec.move(
                                  motionSpec.stagger(i),
                                )}
                                fill={
                                  lit
                                    ? CHART_COLORS.brand
                                    : CHART_COLORS.inkSecondary
                                }
                              />
                              {/* Wider invisible hit area — a 10px bar is a hard target. */}
                              <rect
                                x={node.x - 6}
                                y={node.y0}
                                width={NODE_WIDTH + 12}
                                height={barHeight}
                                fill="transparent"
                              />
                              {labelled.has(`${a}|${node.value}`) && (
                                <NodeLabel
                                  node={node}
                                  alignEnd={last}
                                  maxChars={labelMax}
                                  lit={lit}
                                />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              </svg>
              <ChartTooltip tooltip={tooltip} containerWidth={width} />
            </Box>
          </>
        )}
      </Box>
    </ChartCard>
  );
}

/**
 * Category label, drawn over the ribbons with a surface-coloured halo.
 *
 * Never animated, and positioned from the node's final geometry rather than its
 * tweened one: labels are the frame you measure the ribbons against, so they
 * have to be still and correct the moment the data lands.
 */
function NodeLabel({
  node,
  alignEnd,
  maxChars,
  lit,
}: {
  node: PsNodeLayout;
  alignEnd: boolean;
  maxChars: number;
  lit: boolean;
}) {
  const y = (node.y0 + node.y1) / 2;
  const x = alignEnd ? node.x - 6 : node.x + NODE_WIDTH + 6;

  return (
    <text
      x={x}
      y={y}
      dy="0.32em"
      textAnchor={alignEnd ? "end" : "start"}
      fontSize={11}
      fontWeight={lit ? 600 : 500}
      fill={CHART_COLORS.ink}
      stroke={CHART_COLORS.surface}
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke"
      pointerEvents="none"
    >
      {truncateLabel(node.label, maxChars)}
      <tspan fill={CHART_COLORS.muted} fontWeight={400}>
        {" "}
        {node.count}
      </tspan>
    </text>
  );
}

/**
 * One ribbon: the whole path through every axis as a single mark, so a hover
 * lights up the complete route rather than one hop of it.
 *
 * Its own component because `useAnimatedPath` is a hook — and because a stable
 * ribbon key means React keeps this instance, which is what lets the path morph
 * to its new shape when the data changes instead of snapping.
 */
function Ribbon({
  entry,
  motionSpec,
  dimmed,
  onEnter,
  onMove,
  onLeave,
}: {
  entry: PsRibbonLayout;
  motionSpec: ChartMotion;
  dimmed: boolean;
  onEnter: (event: React.MouseEvent) => void;
  onMove: (event: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const { ribbon, segments } = entry;
  // Interpolating the corner points and rebuilding `d` each frame — never the
  // `d` string, which is not a safe thing to tween.
  const d = useAnimatedPath<PsSegment>(segments, ribbonPathAll, lerpSegment, {
    seed: seedSegments,
  });
  const hitPath = useMemo(() => ribbonPathAll(segments), [segments]);

  return (
    <g onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.path
        d={d}
        fill={ribbon.color}
        stroke="none"
        animate={{ opacity: dimmed ? DIM_OPACITY : 0.62 }}
        transition={motionSpec.hover}
        pointerEvents="none"
      />
      {/* A one-offer ribbon is under a pixel thick; the stroked twin gives it
          something to be hovered by. */}
      <path
        d={hitPath}
        fill="transparent"
        stroke="transparent"
        strokeWidth={6}
      />
    </g>
  );
}

function sharePct(share: number): string {
  const value = share * 100;
  return value < 1 ? "<1%" : `${value.toFixed(0)}%`;
}
