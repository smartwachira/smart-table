import { useQuery } from '@tanstack/react-query';
import api from '../utils/axiosConfig';

// 🛡️ Exported Interfaces
export interface OrderItem {
    quantity: number;
    price_at_time: string | number; 
    MenuItem?: {                    
        name: string;
        image_url?: string;
    };
}

export interface Order {
    order_id: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    total_amount: string | number;
    createdAt: string;
    OrderItems: OrderItem[];
}

// ⚡ THE CUSTOM HOOK
export const useGuestOrders = (guestSessionId: string | null) => {
    return useQuery({
        queryKey: ['guestOrders', guestSessionId],
        queryFn: async () => {
            const res = await api.get<Order[]>('/api/orders/guest');
            return res.data;
        },
        enabled: !!guestSessionId, 
        refetchInterval: 15000, // Background polling safety net
    });
};