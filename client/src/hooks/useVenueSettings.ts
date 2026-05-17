import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface VenueSettings { 
    name?: string; 
    logo_url?: string; 
    wifi_ssid?: string; 
    wifi_password?: string; 
}

const getToken = () => localStorage.getItem('auth_token');

// ⚡ THE CUSTOM HOOK
export const useVenueSettings = () => {
    return useQuery({
        queryKey: ['venueSettings'],
        queryFn: async () => {
            const token = getToken();
            if (!token) throw new Error("No token found");
            
            const res = await axios.get<VenueSettings>('/api/settings/venue', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!getToken(),
        staleTime: 1000 * 60 * 30, // ⚡ Settings rarely change. Cache for 30 minutes!
    });
};