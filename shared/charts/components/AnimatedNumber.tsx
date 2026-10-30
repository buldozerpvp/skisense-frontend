"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { EASE, MOTION } from "@/shared/charts/lib/palette";
import { useChartMotion } from "@/shared/charts/hooks/useChartMotion";

export interface AnimatedNumberProps {
  value: number | null;
  format: (value: number) => string;
  placeholder?: string;
  duration?: number;
  style?: CSSProperties;
}

export const AnimatedNumber = ({
  value,
  format,
  placeholder = "—",
  duration = MOTION.count,
  style,
}: AnimatedNumberProps) => {
  const { reduced } = useChartMotion();
  const node = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value ?? 0);

  useMotionValueEvent(motionValue, "change", (v) => {
    if (node.current) node.current.textContent = format(v);
  });

  useEffect(() => {
    if (value === null) {
      if (node.current) node.current.textContent = placeholder;
      return;
    }
    if (reduced) {
      motionValue.jump(value);
      if (node.current) node.current.textContent = format(value);
      return;
    }
    const controls = animate(motionValue, value, { duration, ease: [...EASE.arrive] as [number, number, number, number] });
    return () => controls.stop();
  }, [value, reduced, duration, format, placeholder, motionValue]);

  return (
    <>
      <span ref={node} aria-hidden style={{ fontVariantNumeric: "tabular-nums", ...style }}>
        {value === null ? placeholder : format(value)}
      </span>
            <span style={VISUALLY_HIDDEN}>{value === null ? placeholder : format(value)}</span>
    </>
  );
};

const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};
