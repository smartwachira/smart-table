import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// 🛡️ Exported Interfaces
export interface StaffMember {
    user_id: string;
    username: string;
    role: string;
    email?: string;
    is_active: boolean;
    last_login?: string;
}

export interface StaffFormData {
    username: string;
    role: string;
    pin: string;
    email: string;
    password?: string;
}

// --- AUTH HELPERS ---
const getToken = () => localStorage.getItem('auth_token');
const getConfig = (venueId?: string) => ({
    headers: { Authorization: `Bearer ${getToken()}` },
    venueId
});

// ============================================================================
// ⚡ 1. FETCH HOOKS (GET)
// ============================================================================

export const useStaff = (venueId?: string) => {
    return useQuery({
        queryKey: ['staff', venueId],
        queryFn: async () => {
            const res = await axios.get<StaffMember[]>('/api/auth/staff', getConfig(venueId));
            return res.data;
        },
        enabled: !!venueId
    });
};

// ============================================================================
// ⚡ 2. MUTATION HOOKS
// ============================================================================

export const useSaveStaff = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        // ⚡ We pass staffId dynamically. If it exists, we PATCH. If not, we POST.
        mutationFn: async ({ data, staffId }: { data: StaffFormData, staffId?: string }) => {
            if (staffId) {
                return axios.patch(`/api/auth/staff/${staffId}`, data, getConfig(venueId));
            } else {
                return axios.post('/api/auth/register/staff', data, getConfig(venueId));
            }
        },
        onSuccess: (_, variables) => {
            toast.success(variables.staffId ? 'Staff updated successfully.' : 'Staff provisioned successfully.');
            queryClient.invalidateQueries({ queryKey: ['staff', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to save staff member.');
        }
    });
};

export const useToggleStaffStatus = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ staffId, is_active }: { staffId: string, is_active: boolean }) => {
            return axios.patch<{ message: string }>(`/api/auth/staff/${staffId}/status`, { is_active }, getConfig(venueId));
        },
        onSuccess: (res) => {
            toast.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['staff', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to change status.');
        }
    });
};

export const useResetStaffPin = (venueId?: string) => {
    return useMutation({
        // We accept the 'name' so we can customize the success toast!
        mutationFn: async ({ staffId, pin }: { staffId: string, pin: string, name: string }) => {
            return axios.patch(`/api/auth/staff/${staffId}/pin`, { pin }, getConfig(venueId));
        },
        onSuccess: (_, variables) => {
            toast.success(`PIN for ${variables.name} reset successfully.`, { duration: 5000 });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to reset PIN.');
        }
    });
};

export const useDeleteStaff = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (staffId: string) => {
            return axios.delete(`/api/auth/staff/${staffId}`, getConfig(venueId));
        },
        onSuccess: () => {
            toast.success('Staff member deleted permanently.');
            queryClient.invalidateQueries({ queryKey: ['staff', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to delete staff member.');
        }
    });
};