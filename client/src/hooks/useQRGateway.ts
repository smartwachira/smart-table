import { useMutation } from '@tanstack/react-query';
import api from '../utils/axiosConfig';

// 🛡️ Exported Interfaces
export interface GuestSessionPayload {
    venueId: string;
    tableName: string;
    mode: string;
}

export interface GuestSessionResponse {
    message: string;
    token: string;
    venueName?: string;
}

// ⚡ THE CUSTOM HOOK
export const useInitializeGuestSession = () => {
    return useMutation({
        mutationFn: async (payload: GuestSessionPayload) => {
            const res = await api.post<GuestSessionResponse>('/api/auth/guest-session', payload);
            return res.data;
        }
    });
};