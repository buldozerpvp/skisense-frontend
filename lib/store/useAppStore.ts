import { create } from "zustand";

interface AppState {
  /** Brand slugs currently selected via the brand cards. Empty = show all. */
  selectedBrands: string[];
  /** Free-text filter typed in the top bar, shared with the offers table. */
  searchText: string;
  toggleBrand: (slug: string) => void;
  setSelectedBrands: (slugs: string[]) => void;
  clearBrands: () => void;
  setSearchText: (text: string) => void;
}

// UI-only state lives here (selection, filter intent). The actual brand
// data stays in TanStack Query's cache — this store never holds a copy
// of server data, only what the user is doing with it.
export const useAppStore = create<AppState>((set) => ({
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
