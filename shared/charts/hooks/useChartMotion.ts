"use client";

import { useMemo } from "react";
import { useReducedMotion, type Transition } from "framer-motion";
import { EASE, MOTION } from "@/shared/charts/lib/palette";

const INSTANT: Transition = { duration: 0 };

type Bezier = [number, number, number, number];

export interface ChartMotion {
  reduced: boolean;
  draw: (delay?: number) => Transition;
  move: (delay?: number) => Transition;
  reorder: (delay?: number) => Transition;
  hover: Transition;
  stagger: (n: number) => number;
  instant: Transition;
}

export const useChartMotion = (): ChartMotion => {
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
};
