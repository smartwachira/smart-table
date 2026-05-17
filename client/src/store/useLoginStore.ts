import { create } from 'zustand';

interface LoginState {
    loginType: 'STAFF' | 'MANAGER';
    email: string;
    username: string;
    setLoginType: (type: 'STAFF' | 'MANAGER') => void;
    setEmail: (email: string) => void;
    setUsername: (username: string) => void;
}

export const useLoginStore = create<LoginState>((set) => ({
    loginType: 'STAFF',
    email: '',
    username: '',
    setLoginType: (loginType) => set({ loginType }),
    setEmail: (email) => set({ email }),
    setUsername: (username) => set({ username }),
}));