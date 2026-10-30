"use client";

import { create } from "zustand";

interface SnapshotCursorState {
  index: number | null;
  playing: boolean;
  setIndex: (index: number | null) => void;
  setPlaying: (playing: boolean) => void;
  advance: (index: number | null) => void;
}

export const useSnapshotCursor = create<SnapshotCursorState>((set) => ({
  index: null,
  playing: false,
  setIndex: (index) => set({ index, playing: false }),
  setPlaying: (playing) => set({ playing }),
  advance: (index) => set({ index }),
}));
