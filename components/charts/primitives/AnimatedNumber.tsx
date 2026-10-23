"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { EASE, MOTION } from "@/lib/charts/palette";
import { useChartMotion } from "@/lib/charts/useChartMotion";

export interface AnimatedNumberProps {
  value: number | null;
  /** Must be referentially stable — pass a module-level formatter. */
  format: (value: number) => string;
  placeholder?: string;
  duration?: number;
  style?: CSSProperties;
}

/**
 * A number that counts up to its new value.
 *
 * Writes straight to the DOM node rather than through state: a setState per
 * frame would re-render the surrounding card sixty times a second. Figures are
 * tabular while counting, otherwise proportional digits change width each frame
 * and the number visibly shivers.
 */
export function AnimatedNumber({
  value,
  format,
  placeholder = "—",
  duration = MOTION.count,
  style,
}: AnimatedNumberProps) {
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
      {/* Screen readers get the settled value once, not sixty intermediate ones. */}
      <span style={VISUALLY_HIDDEN}>{value === null ? placeholder : format(value)}</span>
    </>
  );
}

const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};
