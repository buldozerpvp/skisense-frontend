"use client";

import { useMemo } from "react";
import { useReducedMotion, type Transition } from "framer-motion";
import { EASE, MOTION } from "./palette";

const INSTANT: Transition = { duration: 0 };

/** Cubic-bezier control points, the shape framer-motion expects for `ease`. */
type Bezier = [number, number, number, number];

export interface ChartMotion {
  /** The viewer asked their OS for reduced motion. */
  reduced: boolean;
  /** Mount / draw-in. */
  draw: (delay?: number) => Transition;
  /** A value that moved because the data changed. */
  move: (delay?: number) => Transition;
  /** A rank re-order in the ladder chart. */
  reorder: (delay?: number) => Transition;
  /** Hover feedback. Survives reduced motion — it's interaction, not decoration. */
  hover: Transition;
  /** Stagger delay for item n, capped so long lists don't crawl. */
  stagger: (n: number) => number;
  instant: Transition;
}

/**
 * One source of truth for chart motion. Every chart calls this instead of
 * hard-coding durations or calling useReducedMotion itself, so "reduce motion"
 * is honoured in one place and the timing budget stays visible in palette.ts.
 */
export function useChartMotion(): ChartMotion {
  // null during SSR and the first client paint; treat as "not reduced" so the
  // server and client markup agree, then settle on the real preference.
  const reduced = useReducedMotion() ?? false;

  return useMemo<ChartMotion>(() => {
    const make =
      (duration: number, ease: Bezier) =>
      (delay = 0): Transition =>
        reduced ? INSTANT : { duration, delay, ease };

    return {
      reduced,
      instant: INSTANT,
      hover: { duration: MOTION.hover, ease: "linear" },
      draw: make(MOTION.drawIn, [...EASE.arrive] as Bezier),
      move: make(MOTION.move, [...EASE.move] as Bezier),
      reorder: make(MOTION.reorder, [...EASE.reorder] as Bezier),
      stagger: (n) => (reduced ? 0 : Math.min(n * MOTION.stagger, MOTION.staggerCap)),
    };
  }, [reduced]);
}
