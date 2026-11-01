import { create } from "zustand";

interface FilterRowState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useFilterRow = create<FilterRowState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
