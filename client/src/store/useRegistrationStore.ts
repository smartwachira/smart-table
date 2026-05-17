import { create } from 'zustand';

interface RegistrationState {
    venueName: string;
    location: string;
    managerName: string;
    managerEmail: string;
    setField: (field: keyof Omit<RegistrationState, 'setField'>, value: string) => void;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
    venueName: '',
    location: '',
    managerName: '',
    managerEmail: '',
    setField: (field, value) => set((state) => ({ ...state, [field]: value })),
}));