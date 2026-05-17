import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// 🛡️ Exported Interfaces
export interface OrderItem {
    name?: string;
    quantity: number;
    MenuItem?: {
        name: string;
    };
}

export interface OrderData {
    order_id: string;
    table_number: string;
    customer_name: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    payment_status: 'PENDING' | 'PAID' | 'FAILED';
    payment_method: 'CASH' | 'M-PESA' | string;
    total_amount: number | string;
    staff_id: string;
    OrderItems: OrderItem[];
}

// --- AUTH HELPERS ---
const getToken = () => localStorage.getItem('auth_token');
const getConfig = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

// ============================================================================
// ⚡ 1. FETCH HOOK (GET) - Waiter Specific
// ============================================================================
export const useMyOrders = (userId?: string) => {
    return useQuery({
        queryKey: ['myOrders', userId],
        queryFn: async ({ signal }) => {
            const token = getToken();
            if (!token) throw new Error("No token");

            const response = await axios.get<OrderData[]>('/api/orders/live', {
                ...getConfig(),
                signal
            });
            // ⚡ Filter instantly to only show orders punched by this specific staff member
            return (response.data || []).filter(o => String(o.staff_id) === String(userId));
        },
        enabled: !!userId && !!getToken(),
        refetchInterval: 10000 // Fallback polling
    });
};

// ============================================================================
// ⚡ 2. MUTATION HOOKS (PATCH) - Waiter Specific Invalidation
// ============================================================================
export const useUpdateMyOrderStatus = (userId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string, status: OrderData['status'] }) => {
            return axios.patch(`/api/orders/${orderId}/status`, { status }, getConfig());
        },
        onSuccess: (_, variables) => {
            toast.success(`Order marked as ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['myOrders', userId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to update ticket.");
        }
    });
};

export const useCollectMyOrderCash = (userId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (orderId: string) => {
            return axios.patch(`/api/orders/${orderId}/collect-cash`, {}, getConfig());
        },
        onSuccess: () => {
            toast.success("Cash logged securely.");
            queryClient.invalidateQueries({ queryKey: ['myOrders', userId] });
        },
        onError: () => {
            toast.error("Failed to log cash.");
        }
    });
};