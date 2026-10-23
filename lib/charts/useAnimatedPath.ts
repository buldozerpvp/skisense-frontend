"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { EASE, MOTION } from "./palette";
import { useChartMotion } from "./useChartMotion";

export interface AnimatedPathOptions<T> {
  /** Where the line comes from on first paint — usually the same points flattened
   *  onto the baseline, which reads as the line growing out of the axis. */
  seed?: (points: T[]) => T[];
  duration?: number;
}

/**
 * A `d` attribute that morphs when the data changes.
 *
 * Interpolates the *points* and rebuilds the path each frame. Interpolating the
 * `d` string itself is unsafe, and framer's `pathLength` can't help here: it
 * measures geometry on every change and only ever plays once, so a chart
 * animated that way snaps whenever the filter moves.
 */
export function useAnimatedPath<T>(
  points: T[],
  build: (points: T[]) => string,
  lerp: (a: T, b: T, t: number) => T,
  options: AnimatedPathOptions<T> = {}
): MotionValue<string> {
  const { reduced } = useChartMotion();
  const { seed, duration } = options;
  const progress = useMotionValue(1);

  // The two frames the current tween runs between. Held in a ref and only ever
  // written from the effect below, so nothing reads it during render.
  const frames = useRef<{ from: T[]; to: T[] }>({ from: points, to: points });
  const previous = useRef<T[] | null>(null);

  useEffect(() => {
    // Both frames must be the same length to pair up point-for-point. Holding
    // the last value is cheap and reads as the line extending, which is what
    // actually happened.
    const start = previous.current ?? seed?.(points) ?? points;
    frames.current = { from: resample(start, points.length), to: points };
    previous.current = points;

    if (reduced || points.length === 0) {
      progress.jump(1);
      return;
    }
    progress.jump(0);
    const controls = animate(progress, 1, {
      duration: duration ?? MOTION.move,
      ease: [...EASE.move] as [number, number, number, number],
    });
    return () => controls.stop();
  }, [points, reduced, progress, duration, seed]);

  return useTransform(progress, (t) => {
    const { from, to } = frames.current;
    return t >= 1 ? build(to) : build(to.map((b, i) => lerp(from[i] ?? b, b, t)));
  });
}

function resample<T>(source: T[], length: number): T[] {
  if (source.length === length) return source;
  if (source.length === 0 || length === 0) return [];
  const last = source.length - 1;
  return Array.from({ length }, (_, i) =>
    source[Math.min(Math.round((i / Math.max(length - 1, 1)) * last), last)]
  );
}
