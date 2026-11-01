"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useAllOffers } from "@/features/prices/hooks/usePrices";
import { useChartColors } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";
import { useChartDimensions } from "@/shared/charts/hooks/useChartDimensions";
import { AxisBottom, AxisLeft } from "@/shared/charts/components/Axes";
import { ChartCard, type TableColumn } from "@/shared/charts/components/ChartCard";
import { eur, shortDate } from "@/shared/format/formatters";
import { buildSwarm, type SwarmFrame } from "@/features/analytics/swarm/lib/buildSwarm";
import {
  swarmPalette,
  swarmScales,
  swarmTransitions,
  type SwarmBucket,
} from "@/features/analytics/swarm/lib/swarmFrames";
import { useSwarmPlayback, type SwarmMoment } from "@/features/analytics/swarm/hooks/useSwarmPlayback";
import {
  DOT_ALPHA,
  DOT_RADIUS_PX,
  PRICE_TICK_LADDER,
  SWARM_HEIGHT_PX,
  SWARM_MARGIN,
  SWARM_TICK_COUNT,
} from "@/features/analytics/swarm/constants";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

const TAU = Math.PI * 2;

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

const paintBuckets = (
  ctx: CanvasRenderingContext2D,
  buckets: SwarmBucket[],
  travelled: number,
  alpha: number
): void => {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  for (const bucket of buckets) {
    ctx.fillStyle = bucket.colour;
    ctx.beginPath();
    for (let i = 0; i < bucket.toX.length; i += 1) {
      const x = bucket.fromX[i] + (bucket.toX[i] - bucket.fromX[i]) * travelled;
      const y = bucket.fromY[i] + (bucket.toY[i] - bucket.fromY[i]) * travelled;
      ctx.moveTo(x + DOT_RADIUS_PX, y);
      ctx.arc(x, y, DOT_RADIUS_PX, 0, TAU);
    }
    ctx.fill();
  }
};

const tableColumns: TableColumn<SwarmFrame>[] = [
  { header: "Night", render: (frame) => shortDate(frame.day) },
  { header: "Offers", numeric: true, render: (frame) => frame.dots.length.toLocaleString() },
  { header: "Cheaper", numeric: true, render: (frame) => frame.cheaper.toLocaleString() },
  { header: "Dearer", numeric: true, render: (frame) => frame.dearer.toLocaleString() },
  {
    header: "Median a night",
    numeric: true,
    render: (frame) => (frame.medianPerNight === null ? "—" : eur(Math.round(frame.medianPerNight))),
  },
];

export const PriceSwarm = () => {
  const { data: history, isFetching } = useAllOffers();
  const colors = useChartColors();
  const { reduced } = useChartMotion();
  const { ref: measureRef, width } = useChartDimensions(960);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const model = useMemo(() => buildSwarm(history), [history]);

  const plotWidth = Math.max(width - SWARM_MARGIN.left - SWARM_MARGIN.right, 1);
  const plotHeight = SWARM_HEIGHT_PX - SWARM_MARGIN.top - SWARM_MARGIN.bottom;

  const scales = useMemo(
    () => swarmScales(model, plotWidth, plotHeight),
    [model, plotWidth, plotHeight]
  );

  const palette = useMemo(() => swarmPalette(colors), [colors]);

  const priceTicks = useMemo(() => {
    const [low, high] = scales.y.domain();
    return PRICE_TICK_LADDER.filter((value) => value >= low && value <= high);
  }, [scales]);

  const transitions = useMemo(
    () => swarmTransitions(model, scales, palette),
    [model, scales, palette]
  );

  const transitionsRef = useRef(transitions);

  useEffect(() => {
    transitionsRef.current = transitions;
  }, [transitions]);

  const render = useCallback(
    ({ index, travelled, fade }: SwarmMoment) => {
      const canvas = canvasRef.current;
      const transition = transitionsRef.current[index];
      if (!canvas || !transition) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const ratio = window.devicePixelRatio || 1;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, plotWidth, plotHeight);

      const eased = easeOut(travelled);
      paintBuckets(ctx, transition.moving, eased, DOT_ALPHA * fade);
      paintBuckets(ctx, transition.entering, eased, DOT_ALPHA * travelled * fade);
      paintBuckets(ctx, transition.leaving, eased, DOT_ALPHA * (1 - travelled) * fade);
      ctx.globalAlpha = 1;
    },
    [plotWidth, plotHeight]
  );

  const { frameIndex, hostRef, redraw, hold, release } = useSwarmPlayback({
    frameCount: model.frames.length,
    reduced,
    render,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(plotWidth * ratio);
    canvas.height = Math.round(plotHeight * ratio);
    canvas.style.width = `${plotWidth}px`;
    canvas.style.height = `${plotHeight}px`;
    redraw();
  }, [plotWidth, plotHeight, redraw]);

  useEffect(() => {
    redraw();
  }, [transitions, redraw]);

  const frame = model.frames[frameIndex];
  const nights = model.frames.length;

  const caption = frame
    ? `${frame.dots.length.toLocaleString()} offers on ${shortDate(frame.day)}: ${frame.cheaper.toLocaleString()} cheaper and ${frame.dearer.toLocaleString()} dearer than the night we started watching them.`
    : "Not enough collected nights yet.";

  return (
    <ChartCard
      title="Every tracked offer, night by night"
      subtitle="One dot per offer — across is the week it departs, up is what it costs a night per person. Aqua has come down since we first saw it, red has gone up."
      isEmpty={model.frames.length < 2}
      emptyMessage="Two nights of collection are needed before prices can be watched moving."
      isFetching={isFetching}
      tableRows={model.frames}
      tableColumns={tableColumns}
    >
      <Box ref={hostRef} onPointerEnter={hold} onPointerLeave={release} onFocus={hold} onBlur={release}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="baseline" spacing={1.5}>
            <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {frame ? shortDate(frame.day) : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              night {Math.min(frameIndex + 1, nights)} of {nights}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Typography variant="caption" sx={{ color: colors.drop, fontVariantNumeric: "tabular-nums" }}>
              ▼ {(frame?.cheaper ?? 0).toLocaleString()} cheaper
            </Typography>
            <Typography variant="caption" sx={{ color: colors.rise, fontVariantNumeric: "tabular-nums" }}>
              ▲ {(frame?.dearer ?? 0).toLocaleString()} dearer
            </Typography>
          </Stack>
        </Stack>

        <Box ref={measureRef} sx={{ position: "relative", width: "100%", height: SWARM_HEIGHT_PX }}>
          <Box
            component="canvas"
            ref={canvasRef}
            aria-hidden
            sx={{ position: "absolute", left: SWARM_MARGIN.left, top: SWARM_MARGIN.top }}
          />
          <Box
            component="svg"
            role="img"
            aria-label={caption}
            width={width}
            height={SWARM_HEIGHT_PX}
            sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <g transform={`translate(${SWARM_MARGIN.left}, ${SWARM_MARGIN.top})`}>
              <AxisLeft
                scale={scales.y}
                width={plotWidth}
                values={priceTicks}
                format={(value) => eur(value)}
              />
              <AxisBottom
                scale={scales.x}
                width={plotWidth}
                y={plotHeight}
                tickCount={SWARM_TICK_COUNT.x}
                format={(value) => MONTH.format(value as unknown as Date)}
              />
            </g>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {reduced
            ? "Motion is off, so this shows the most recent night."
            : "Replays every collected night, on a loop. Point at it to hold it still."}
        </Typography>
      </Box>
    </ChartCard>
  );
};
