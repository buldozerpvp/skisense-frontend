"use client";

import { useCallback, useRef, useState } from "react";

/** Space a chart reserves outside its plot area for axes, ticks and labels. */
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Measures the container width.
 *
 * The returned `ref` is a callback ref on purpose. With a plain ref object and
 * a mount-time effect, the observer attached once — and because ChartCard
 * unmounts its children while a query is loading, the element it wanted was
 * usually still null at that moment, so every chart stayed frozen at the
 * fallback width for the life of the page. A callback ref re-attaches whenever
 * the element appears, disappears or is swapped.
 *
 * The initial width is a constant, never a measurement: server and first
 * client render must produce identical markup or hydration breaks.
 */
export function useChartDimensions(defaultWidth = 640) {
  const [width, setWidth] = useState(defaultWidth);
  const observer = useRef<ResizeObserver | null>(null);
  const frame = useRef(0);

  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;

    // Coalesce to one update per frame: a window drag otherwise re-runs every
    // scale and restarts every tween on each observer callback.
    const next = new ResizeObserver((entries) => {
      const measured = Math.round(entries[0]?.contentRect.width ?? 0);
      if (measured <= 0) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() =>
        setWidth((current) => (current === measured ? current : measured))
      );
    });
    next.observe(node);
    observer.current = next;
  }, []);

  return { ref, width };
}
