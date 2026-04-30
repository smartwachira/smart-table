import { create } from 'zustand';

interface MyOrdersState {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const useMyOrdersStore = create<MyOrdersState>((set) => ({
    activeTab: 'READY',
    setActiveTab: (tab: string) => set({ activeTab: tab })
}));