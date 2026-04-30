import { create } from 'zustand';

interface MenuState {
    activeCategoryId: string;
    searchQuery: string;
    setActiveCategory: (id: string) => void;
    setSearchQuery: (query: string) => void;
    resetFilters: () => void;
}

export const useMenuStore = create<MenuState>((set) => ({
    activeCategoryId: 'all',
    searchQuery: '',
    setActiveCategory: (id) => set({ activeCategoryId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    resetFilters: () => set({ activeCategoryId: 'all', searchQuery: '' })
}));