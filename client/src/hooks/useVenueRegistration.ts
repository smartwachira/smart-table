import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface RegistrationResponse {
    token: string;
    message?: string;
    user?: any;
}

// ⚡ THE CUSTOM HOOK
export const useRegisterVenue = () => {
    return useMutation({
        mutationFn: async (payload: any) => {
            const res = await axios.post<RegistrationResponse>('/api/auth/register/venue', payload);
            return res.data;
        }
    });
};