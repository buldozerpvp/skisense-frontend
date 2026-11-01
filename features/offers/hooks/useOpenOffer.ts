import { create } from "zustand";

interface OpenOfferState {
  key: string | null;
  open: (key: string) => void;
  close: () => void;
}

export const useOpenOffer = create<OpenOfferState>((set) => ({
  key: null,
  open: (key) => set({ key }),
  close: () => set({ key: null }),
}));
