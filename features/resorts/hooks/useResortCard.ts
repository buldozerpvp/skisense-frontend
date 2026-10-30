"use client";

import { create } from "zustand";

interface ResortCardState {
  openKey: string | null;
  fallbackName: string | null;
  open: (key: string | undefined, name?: string) => void;
  close: () => void;
}

export const useResortCard = create<ResortCardState>((set) => ({
  openKey: null,
  fallbackName: null,
  open: (key, name) => set({ openKey: key ?? null, fallbackName: name ?? null }),
  close: () => set({ openKey: null, fallbackName: null }),
}));
