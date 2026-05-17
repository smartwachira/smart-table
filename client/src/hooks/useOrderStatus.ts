import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces so other components can use them
export type OrderStatusType = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderData {
    order_id: string;
    status: OrderStatusType;
    [key: string]: any; 
}

export interface SocketUpdatePayload {
    orderId: string;
    status: OrderStatusType;
}

// ⚡ THE CUSTOM HOOK
export const useOrderStatus = (orderId: string | undefined, venueId: string | null) => {
    return useQuery({
        queryKey: ['orderStatus', orderId],
        queryFn: async () => {
            if (!orderId) throw new Error("No Order ID");

            const token = localStorage.getItem('guest_token');
            if (!token) throw new Error("Unauthorized: No guest session found.");

            const res = await axios.get<OrderData>(`/api/orders/${orderId}/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!orderId && !!venueId,
        refetchInterval: 15000 // Fallback poll every 15s in case sockets disconnect on mobile
    });
};