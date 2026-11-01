"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  SWIPE_CLOSE_FRACTION,
  SWIPE_CLOSE_MIN_PX,
  SWIPE_CLOSE_VELOCITY,
  SWIPE_SETTLE_MS,
  SWIPE_VELOCITY_WINDOW_MS,
} from "@/features/offers/filtering/constants";

const swallowTouchMove = (event: TouchEvent) => {
  if (event.cancelable) event.preventDefault();
};

interface Drag {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  sampleY: number;
  sampleTime: number;
}

export const useSwipeToClose = (onClose: () => void) => {
  const paperRef = useRef<HTMLDivElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);

  const zoneCallback = useCallback((node: HTMLDivElement | null) => {
    zoneRef.current?.removeEventListener("touchmove", swallowTouchMove);
    zoneRef.current = node;
    node?.addEventListener("touchmove", swallowTouchMove, { passive: false });
  }, []);

  useEffect(() => () => zoneRef.current?.removeEventListener("touchmove", swallowTouchMove), []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      sampleY: event.clientY,
      sampleTime: event.timeStamp,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (paperRef.current) paperRef.current.style.transition = "none";
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    const paper = paperRef.current;
    if (!current || current.pointerId !== event.pointerId || !paper) return;
    if (event.timeStamp - current.sampleTime > SWIPE_VELOCITY_WINDOW_MS) {
      current.sampleY = current.lastY;
      current.sampleTime = current.lastTime;
    }
    current.lastY = event.clientY;
    current.lastTime = event.timeStamp;
    paper.style.transform = `translateY(${Math.max(0, event.clientY - current.startY)}px)`;
  }, []);

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const current = drag.current;
      const paper = paperRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      if (!paper) return;

      const travelled = Math.max(0, current.lastY - current.startY);
      const velocity = (current.lastY - current.sampleY) / Math.max(1, current.lastTime - current.sampleTime);
      const flicked = velocity > SWIPE_CLOSE_VELOCITY && travelled > SWIPE_CLOSE_MIN_PX;
      const pulledFar = travelled > paper.offsetHeight * SWIPE_CLOSE_FRACTION;

      paper.style.transition = "";
      if (flicked || pulledFar) {
        onClose();
        return;
      }
      paper.style.transition = `transform ${SWIPE_SETTLE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
      paper.style.transform = "translateY(0)";
      window.setTimeout(() => {
        paper.style.transition = "";
        paper.style.transform = "";
      }, SWIPE_SETTLE_MS);
    },
    [onClose]
  );

  return {
    paperRef,
    dragProps: {
      ref: zoneCallback,
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
};
