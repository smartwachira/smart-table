import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface LoginResponse {
    token: string;
    user: {
        id: string;
        name: string;
        role: string;
        venue_id: string;
        [key: string]: any;
    };
    message: string;
}

export interface LoginPayload {
    loginType: 'STAFF' | 'MANAGER';
    email?: string;
    password?: string;
    venue_id?: string | null;
    username?: string;
    pin?: string;
}

// ⚡ THE CUSTOM HOOK
export const useLoginMutation = () => {
    return useMutation({
        mutationFn: async (payload: LoginPayload) => {
            const endpoint = payload.loginType === 'MANAGER' ? '/api/auth/login/manager' : '/api/auth/login/staff';
            const res = await axios.post<LoginResponse>(`http://localhost:5000${endpoint}`, payload);
            return res.data;
        }
    });
};