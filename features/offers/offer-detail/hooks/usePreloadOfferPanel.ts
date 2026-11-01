"use client";

import { useEffect } from "react";
import { preloadMapLibrary } from "@/features/resorts/components/ResortMap";

export const usePreloadOfferPanel = (): void => {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => preloadMapLibrary());
    return () => cancel(handle);
  }, []);
};
