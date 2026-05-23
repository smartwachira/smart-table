import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axiosConfig';
import { useGuestSessionStore } from '../store/useGuestSessionStore';

// ⚡ SPRINT 21 FIX: Explicitly tell the Frontend what an Order object contains
export interface GuestOrderItem {
    item_id: string;
    quantity: number;
    price_at_time: number | string;
    MenuItem?: {
        name: string;
        image_url?: string;
    };
}

export interface GuestOrder {
    order_id: string;
    venue_id: string;
    table_number: string;
    customer_name: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'UNPAID_TAB';
    payment_method: 'CASH' | 'M-PESA' | 'CARD' | 'TAB';
    total_amount: number | string;
    createdAt: string;
    updatedAt: string;
    OrderItems: GuestOrderItem[];
}

// ============================================================================
// 1. FETCH GUEST ORDERS
// ============================================================================
export const useGuestOrders = (guestSessionId: string | null) => {
    return useQuery({
        queryKey: ['guestOrders', guestSessionId],
        queryFn: async (): Promise<GuestOrder[]> => {
            if (!guestSessionId) return [];
            const response = await api.get('/api/orders/guest', {
                headers: { 'x-guest-id': guestSessionId }
            });
            return response.data;
        },
        enabled: !!guestSessionId,
        refetchInterval: 15000 // Poll as a fallback to Sockets
    });
};

// ============================================================================
// 2. SPRINT 21: BULK SETTLE GUEST TAB
// ============================================================================
export const useSettleGuestTab = () => {
    const queryClient = useQueryClient(); // ⚡ Fixed missing import
    return useMutation({
        mutationFn: async (payload: { orderIds: string[], payment_method: string, phone?: string, provider?: string }) => {
            const guestSessionId = useGuestSessionStore.getState().guestSessionId;
            const res = await api.post('/api/orders/tabs/guest-checkout', payload, {
                headers: { 'x-guest-id': guestSessionId }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guestOrders'] });
        }
    });
};