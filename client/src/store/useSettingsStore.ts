import { create } from 'zustand';

type SettingsTab = 'profile' | 'operations' | 'billing';

interface SettingsState {
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    activeTab: 'profile',
    setActiveTab: (tab) => set({ activeTab: tab })
}));