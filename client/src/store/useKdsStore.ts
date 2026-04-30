import { create } from 'zustand';

interface kdsState {
    activeTab: string;
    searchQuery: string;
    setActiveTab: (tab: string) => void;
    setSearchQuery: (query: string) => void;
}

export const useKdsStore = create<kdsState>((set) => ({
    activeTab: 'PENDING',
    searchQuery: '',
    setActiveTab: (tab: string) => set({ activeTab : tab }),
    setSearchQuery: (query: string) => set({ searchQuery: query})
}));