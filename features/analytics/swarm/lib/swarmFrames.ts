import { interpolateLab } from "d3-interpolate";
import { scaleLog, scaleUtc, type ScaleContinuousNumeric, type ScaleTime } from "d3-scale";
import type { ChartColors } from "@/shared/charts/lib/palette";
import type { SwarmFrame, SwarmModel } from "@/features/analytics/swarm/lib/buildSwarm";
import {
  COLOUR_STEPS,
  DAY_MS,
  DEPARTURE_PAD_DAYS,
  JITTER_DAYS,
  MOVE_NOISE_PCT,
} from "@/features/analytics/swarm/constants";

export interface SwarmBucket {
  colour: string;
  fromX: Float32Array;
  fromY: Float32Array;
  toX: Float32Array;
  toY: Float32Array;
}

export interface SwarmTransition {
  moving: SwarmBucket[];
  entering: SwarmBucket[];
  leaving: SwarmBucket[];
}

export interface SwarmScales {
  x: ScaleTime<number, number>;
  y: ScaleContinuousNumeric<number, number>;
}

export const swarmScales = (model: SwarmModel, width: number, height: number): SwarmScales => {
  return {
    x: scaleUtc()
      .domain([
        model.departureSpan[0] - DEPARTURE_PAD_DAYS * DAY_MS,
        model.departureSpan[1] + DEPARTURE_PAD_DAYS * DAY_MS,
      ])
      .range([0, Math.max(width, 1)]),
    y: scaleLog()
      .domain([Math.max(model.perNightSpan[0], 1), Math.max(model.perNightSpan[1], 2)])
      .range([Math.max(height, 1), 0]),
  };
};

const jitterOf = (key: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2001) / 1000 - 1;
};

export const swarmPalette = (colors: ChartColors): string[] => {
  const middle = (COLOUR_STEPS - 1) / 2;
  return Array.from({ length: COLOUR_STEPS }, (_, step) => {
    if (step < middle) return interpolateLab(colors.drop, colors.neutral)(step / middle);
    if (step > middle) return interpolateLab(colors.neutral, colors.rise)((step - middle) / middle);
    return colors.neutral;
  });
};

const bucketOf = (movePct: number, boundPct: number): number => {
  const middle = (COLOUR_STEPS - 1) / 2;
  const size = Math.abs(movePct);
  if (size < MOVE_NOISE_PCT) return middle;
  const span = Math.max(boundPct - MOVE_NOISE_PCT, 1);
  const strength = Math.min(1, (size - MOVE_NOISE_PCT) / span);
  const steps = Math.max(1, Math.round(strength * middle));
  return movePct < 0 ? middle - steps : middle + steps;
};

interface Placed {
  x: number;
  y: number;
  bucket: number;
}

export type SwarmPlacement = Map<string, Placed>;

export const placeFrame = (
  frame: SwarmFrame,
  scales: SwarmScales,
  boundPct: number
): SwarmPlacement => {
  const placed: SwarmPlacement = new Map();
  for (const dot of frame.dots) {
    placed.set(dot.key, {
      x: scales.x(new Date(dot.departureValue + jitterOf(dot.key) * JITTER_DAYS * DAY_MS)),
      y: scales.y(dot.perNight),
      bucket: bucketOf(dot.movePct, boundPct),
    });
  }
  return placed;
};

interface Pending {
  fromX: number[];
  fromY: number[];
  toX: number[];
  toY: number[];
}

const emptyBuckets = (): Pending[] => {
  return Array.from({ length: COLOUR_STEPS }, () => ({ fromX: [], fromY: [], toX: [], toY: [] }));
};

const freeze = (pending: Pending[], palette: string[]): SwarmBucket[] => {
  const buckets: SwarmBucket[] = [];
  for (let step = 0; step < pending.length; step += 1) {
    const group = pending[step];
    if (group.toX.length === 0) continue;
    buckets.push({
      colour: palette[step],
      fromX: Float32Array.from(group.fromX),
      fromY: Float32Array.from(group.fromY),
      toX: Float32Array.from(group.toX),
      toY: Float32Array.from(group.toY),
    });
  }
  return buckets;
};

export const swarmTransition = (
  from: SwarmPlacement,
  to: SwarmPlacement,
  palette: string[]
): SwarmTransition => {
  const moving = emptyBuckets();
  const entering = emptyBuckets();
  const leaving = emptyBuckets();

  for (const [key, target] of to) {
    const origin = from.get(key);
    const group = origin ? moving[target.bucket] : entering[target.bucket];
    group.fromX.push(origin?.x ?? target.x);
    group.fromY.push(origin?.y ?? target.y);
    group.toX.push(target.x);
    group.toY.push(target.y);
  }

  for (const [key, origin] of from) {
    if (to.has(key)) continue;
    const group = leaving[origin.bucket];
    group.fromX.push(origin.x);
    group.fromY.push(origin.y);
    group.toX.push(origin.x);
    group.toY.push(origin.y);
  }

  return { moving: freeze(moving, palette), entering: freeze(entering, palette), leaving: freeze(leaving, palette) };
};

export const swarmTransitions = (
  model: SwarmModel,
  scales: SwarmScales,
  palette: string[]
): SwarmTransition[] => {
  const placements = model.frames.map((frame) => placeFrame(frame, scales, model.moveBoundPct));
  const transitions: SwarmTransition[] = [];
  for (let i = 0; i < placements.length; i += 1) {
    const previous = i === 0 ? new Map() : placements[i - 1];
    transitions.push(swarmTransition(previous, placements[i], palette));
  }
  return transitions;
};
