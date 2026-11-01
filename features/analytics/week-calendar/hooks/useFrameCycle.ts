"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOOP_REST_MS, NIGHT_HOLD_MS } from "@/features/analytics/week-calendar/constants";

export interface FrameCycle {
  index: number;
  resting: boolean;
  hostRef: (node: HTMLElement | null) => void;
  hold: () => void;
  release: () => void;
}

export const useFrameCycle = (frameCount: number, reduced: boolean): FrameCycle => {
  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [held, setHeld] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  const hostRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const next = new IntersectionObserver((entries) => setOnScreen(entries[0]?.isIntersecting ?? true), {
      rootMargin: "120px",
    });
    next.observe(node);
    observer.current = next;
  }, []);

  useEffect(() => {
    const sync = () => setTabVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const running = !reduced && onScreen && tabVisible && !held && frameCount > 1;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!reduced || frameCount === 0) return;
    setResting(false);
    setIndex(frameCount - 1);
  }, [reduced, frameCount]);

  useEffect(() => {
    if (!running) return;
    if (resting) {
      const timer = setTimeout(() => {
        setIndex(0);
        setResting(false);
      }, LOOP_REST_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      if (index >= frameCount - 1) setResting(true);
      else setIndex(index + 1);
    }, NIGHT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [running, resting, index, frameCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    index: Math.min(index, Math.max(frameCount - 1, 0)),
    resting,
    hostRef,
    hold: useCallback(() => setHeld(true), []),
    release: useCallback(() => setHeld(false), []),
  };
};
