"use client";

import { create } from "zustand";

interface SnapshotCursorState {
  /** Index into the snapshot days array. null = live (the latest snapshot). */
  index: number | null;
  playing: boolean;
  setIndex: (index: number | null) => void;
  setPlaying: (playing: boolean) => void;
  /** Used by playback itself, which must move the cursor without stopping. */
  advance: (index: number | null) => void;
}

/**
 * Which snapshot day the analytics section is showing. Lives in a store rather
 * than local state so the scrubber and every chart read the same cursor.
 */
export const useSnapshotCursor = create<SnapshotCursorState>((set) => ({
  index: null,
  playing: false,
  // Touching the slider is a request to stop and look.
  setIndex: (index) => set({ index, playing: false }),
  setPlaying: (playing) => set({ playing }),
  advance: (index) => set({ index }),
}));
