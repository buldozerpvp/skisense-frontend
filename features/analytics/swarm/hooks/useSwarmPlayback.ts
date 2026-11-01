"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FRAME_HOLD_MS, FRAME_TRAVEL_MS, LOOP_REST_MS } from "@/features/analytics/swarm/constants";

export interface SwarmMoment {
  index: number;
  travelled: number;
  fade: number;
}

const STEP_MS = FRAME_TRAVEL_MS + FRAME_HOLD_MS;

export const momentAt = (elapsed: number, frameCount: number): SwarmMoment => {
  if (frameCount <= 0) return { index: 0, travelled: 1, fade: 1 };
  const cycle = frameCount * STEP_MS + LOOP_REST_MS;
  const within = ((elapsed % cycle) + cycle) % cycle;
  const playing = frameCount * STEP_MS;
  if (within >= playing) {
    return { index: frameCount - 1, travelled: 1, fade: 1 - (within - playing) / LOOP_REST_MS };
  }
  const index = Math.floor(within / STEP_MS);
  return { index, travelled: Math.min(1, (within - index * STEP_MS) / FRAME_TRAVEL_MS), fade: 1 };
};

interface SwarmPlaybackOptions {
  frameCount: number;
  reduced: boolean;
  render: (moment: SwarmMoment) => void;
}

export interface SwarmPlayback {
  frameIndex: number;
  hostRef: (node: HTMLElement | null) => void;
  redraw: () => void;
  hold: () => void;
  release: () => void;
}

export const useSwarmPlayback = ({ frameCount, reduced, render }: SwarmPlaybackOptions): SwarmPlayback => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [held, setHeld] = useState(false);

  const renderRef = useRef(render);
  const elapsedRef = useRef(0);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

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

  const redraw = useCallback(() => {
    if (frameCount <= 0) return;
    const moment = reduced
      ? { index: frameCount - 1, travelled: 1, fade: 1 }
      : momentAt(elapsedRef.current, frameCount);
    renderRef.current(moment);
    setFrameIndex((current) => (current === moment.index ? current : moment.index));
  }, [frameCount, reduced]);

  const running = !reduced && onScreen && tabVisible && !held && frameCount > 1;

  useEffect(() => {
    if (!running) {
      redraw();
      return;
    }
    let frame = 0;
    let base = performance.now();
    const tick = (now: number) => {
      elapsedRef.current = Math.max(0, elapsedRef.current + (now - base));
      base = now;
      const moment = momentAt(elapsedRef.current, frameCount);
      renderRef.current(moment);
      setFrameIndex((current) => (current === moment.index ? current : moment.index));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, frameCount, redraw]);

  return {
    frameIndex: Math.min(frameIndex, Math.max(frameCount - 1, 0)),
    hostRef,
    redraw,
    hold: useCallback(() => setHeld(true), []),
    release: useCallback(() => setHeld(false), []),
  };
};
