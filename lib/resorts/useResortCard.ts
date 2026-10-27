"use client";

import { create } from "zustand";

interface ResortCardState {
  /** The resortKey whose card is open, or null. */
  openKey: string | null;
  /** Fallback label when a key has no catalogue entry. */
  fallbackName: string | null;
  open: (key: string | undefined, name?: string) => void;
  close: () => void;
}

/**
 * One card, opened from anywhere.
 *
 * A resort name is clickable in the phone list, in the offer sheet and in the
 * desktop table, and all three want the same card — so the open state lives
 * here rather than being threaded through each of them.
 */
export const useResortCard = create<ResortCardState>((set) => ({
  openKey: null,
  fallbackName: null,
  open: (key, name) => set({ openKey: key ?? null, fallbackName: name ?? null }),
  close: () => set({ openKey: null, fallbackName: null }),
}));
