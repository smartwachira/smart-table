import { create } from 'zustand';

interface OrderHistoryState {
    preset: string;
    label: string;
    customStart: string;
    customEnd: string;
    searchQuery: string;
    setDateFilter: (preset: string, label: string, start?: string, end?: string) => void;
    setSearchQuery: (query: string) => void;
}

export const useOrderHistoryStore = create<OrderHistoryState>((set) => ({
    preset: 'today',
    label: 'Today',
    customStart: '',
    customEnd: '',
    searchQuery: '',
    setDateFilter: (preset, label, start = '', end = '') => 
        set({ preset, label, customStart: start, customEnd: end }),
    setSearchQuery: (query) => set({ searchQuery: query })
}));