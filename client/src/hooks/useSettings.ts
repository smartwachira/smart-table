import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// 🛡️ Exported Interfaces
export interface VenueSettingsFormData {
    name: string;
    location: string;
    contact_email: string;
    phone_number: string;
    tax_rate: number | string;
    is_accepting_orders: boolean | string;
    allow_cash_payments: boolean | string;
    wifi_ssid: string;
    wifi_password?: string;
    shift_duration_hours?: number | string;
    logo_url?: string;
    is_financially_onboarded?: boolean;
    settlement_bank?: string;
    account_number_last_4?: string;
}

// ⚡ HELPER: Bulletproof Image Pathing
export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; 
    const sanitizedPath = path.replace(/\\/g, '/');
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cleanPath}`;
};

// --- AUTH HELPERS ---
const getToken = () => localStorage.getItem('auth_token');
const getConfig = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

// ============================================================================
// ⚡ 1. FETCH HOOK (GET)
// ============================================================================

export const useFetchSettings = (venueId?: string) => {
    return useQuery({
        queryKey: ['venueSettings', venueId],
        queryFn: async () => {
            const res = await axios.get<VenueSettingsFormData>('/api/settings/venue', getConfig());
            return res.data;
        },
        enabled: !!venueId && !!getToken()
    });
};

// ============================================================================
// ⚡ 2. MUTATION HOOKS (PUT / POST)
// ============================================================================

export const useUpdateSettings = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (updatedData: VenueSettingsFormData) => {
            return axios.put('/api/settings/venue', updatedData, getConfig());
        },
        onSuccess: () => {
            toast.success("Settings saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['venueSettings', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to save settings.");
        }
    });
};

export const useUploadLogo = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const uploadData = new FormData();
            uploadData.append('image', file);
            const res = await axios.post<{ logo_url: string }>('/api/settings/venue/logo', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${getToken()}` }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Logo uploaded successfully!");
            queryClient.invalidateQueries({ queryKey: ['venueSettings', venueId] });
        },
        // We leave the onError toast to the component so it can handle the UI revert
    });
};

// 2. Add this new mutation hook at the bottom of the file
export const useOnboardSubaccount = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { settlement_bank: string; account_number: string }) => {
            const res = await axios.post('/api/paystack/onboard-subaccount', payload, getConfig());
            return res.data;
        },
        onSuccess: () => {
            toast.success("Payout account connected successfully!");
            queryClient.invalidateQueries({ queryKey: ['venueSettings', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to verify account details.");
        }
    });
};