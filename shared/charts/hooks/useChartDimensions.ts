"use client";

import { useCallback, useRef, useState } from "react";

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const useChartDimensions = (defaultWidth = 640) => {
  const [width, setWidth] = useState(defaultWidth);
  const observer = useRef<ResizeObserver | null>(null);
  const frame = useRef(0);

  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;

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
};
