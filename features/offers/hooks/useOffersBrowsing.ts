import { create } from "zustand";

interface AppState {
  selectedBrands: string[];
  searchText: string;
  toggleBrand: (slug: string) => void;
  setSelectedBrands: (slugs: string[]) => void;
  clearBrands: () => void;
  setSearchText: (text: string) => void;
}

export const useOffersBrowsing = create<AppState>((set) => ({
  selectedBrands: [],
  searchText: "",
  toggleBrand: (slug) =>
    set((state) => ({
      selectedBrands: state.selectedBrands.includes(slug)
        ? state.selectedBrands.filter((s) => s !== slug)
        : [...state.selectedBrands, slug],
    })),
  setSelectedBrands: (slugs) => set({ selectedBrands: slugs }),
  clearBrands: () => set({ selectedBrands: [] }),
  setSearchText: (text) => set({ searchText: text }),
}));
