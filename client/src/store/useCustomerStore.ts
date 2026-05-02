import { create } from 'zustand';

interface CustomerState {
    activeCategory: string;
    searchQuery: string;
    setActiveCategory: (category: string) => void;
    setSearchQuery: (query: string) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
    activeCategory: 'all',
    searchQuery: '',
    setActiveCategory: (category) => set({ activeCategory: category }),
    setSearchQuery: (query) => set({ searchQuery: query })
}));