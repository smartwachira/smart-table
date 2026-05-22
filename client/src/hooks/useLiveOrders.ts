import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// 🛡️ Exported Interfaces
export interface OrderItem {
    name?: string;
    quantity: number;
    notes?: string;
    MenuItem?: {
        name: string;
        description?: string;
    };
}

export interface OrderData {
    order_id: string;
    table_number: string;
    customer_name: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    payment_status: 'PENDING' | 'PAID' | 'FAILED';
    payment_method: 'CASH' | 'M-PESA' | 'TAB' | string;
    total_amount: number | string;
    createdAt?: string;
    created_at?: string;
    notes?: string;
    CashCollector?: { name: string };
    OrderItems: OrderItem[];
}

const getConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
});

// ⚡ 1. THE FETCH HOOK (GET)
export const useLiveOrders = (venueId?: string) => {
    return useQuery({
        queryKey: ['liveOrders', venueId],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error("No token");
            const response = await axios.get<OrderData[]>('/api/orders/live', getConfig());
            return response.data || [];
        },
        enabled: !!venueId,
        refetchInterval: 10000 
    });
};

// ⚡ 2. THE STATUS UPDATE HOOK (PATCH)
export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string, status: OrderData['status'] }) => {
            return axios.patch(`/api/orders/${orderId}/status`, { status }, getConfig());
        },
        onSuccess: (_, variables) => {
            toast.success(`Ticket advanced to ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] }); 
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to advance ticket.");
        }
    });
};

// ⚡ 3. THE CANCEL HOOK (PATCH)
export const useCancelOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, cancelReason }: { orderId: string, cancelReason: string }) => {
            return axios.patch(`/api/orders/${orderId}/status`, 
                { status: 'CANCELLED', cancelReason }, 
                getConfig()
            );
        },
        onSuccess: () => {
            toast.success("Order Cancelled");
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: () => toast.error("Failed to cancel order.")
    });
};

// ⚡ 4. THE CASH COLLECTION HOOK (PATCH)
export const useCollectCash = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (orderId: string) => {
            return axios.patch(`/api/orders/${orderId}/collect-cash`, {}, getConfig());
        },
        onSuccess: () => {
            toast.success("Cash collection logged successfully.");
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: () => toast.error("Failed to log cash collection.")
    });
};

// ⚡ 5. SPRINT 20: BULK TAB SETTLEMENT HOOK (PATCH)
export const useSettleTab = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ table_number, settlement_method }: { table_number: string, settlement_method: string }) => {
            return axios.patch(`/api/orders/tabs/settle`, { table_number, settlement_method }, getConfig());
        },
        onSuccess: () => {
            toast.success("Tab settled successfully!");
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to settle tab.");
        }
    });
};