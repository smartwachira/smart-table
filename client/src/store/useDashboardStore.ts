import { create } from 'zustand';

interface DashboardState {
    preset: string;
    label: string;
    customStart: string;
    customEnd: string;
    setDateFilter: (preset: string,label:string,start?: string,end?:string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    preset: 'shift',
    label: 'Current Shift',
    customStart: '',
    customEnd: '',
    setDateFilter: (preset, label, start = '', end = '') => 
        set({ preset, label, customStart: start, customEnd: end }),
}))