"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { EASE, MOTION } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";

export interface AnimatedPathOptions<T> {
  seed?: (points: T[]) => T[];
  duration?: number;
}

export const useAnimatedPath = <T>(points: T[], build: (points: T[]) => string, lerp: (a: T, b: T, t: number) => T, options: AnimatedPathOptions<T> = {}): MotionValue<string> => {
  const { reduced } = useChartMotion();
  const { seed, duration } = options;
  const progress = useMotionValue(1);

  const frames = useRef<{ from: T[]; to: T[] }>({ from: points, to: points });
  const previous = useRef<T[] | null>(null);

  useEffect(() => {
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
};

const resample = <T>(source: T[], length: number): T[] => {
  if (source.length === length) return source;
  if (source.length === 0 || length === 0) return [];
  const last = source.length - 1;
  return Array.from({ length }, (_, i) =>
    source[Math.min(Math.round((i / Math.max(length - 1, 1)) * last), last)]
  );
};
