import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../utils/axiosConfig';
import { useGuestSessionStore } from '../store/useGuestSessionStore';

// ⚡ SPRINT 23: Strict Types
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
    payment_method: 'CASH' | 'M-PESA' | 'AIRTEL' | 'CARD' | 'TAB';
    total_amount: number | string;
    createdAt: string;
    updatedAt: string;
    OrderItems: GuestOrderItem[];
}

// ============================================================================
// 1. ⚡ REAL-TIME FETCH GUEST ORDERS
// ============================================================================
export const useGuestOrders = (guestSessionId: string | null, venueId?: string | null) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['guestOrders', guestSessionId],
        queryFn: async (): Promise<GuestOrder[]> => {
            if (!guestSessionId) return [];
            // 🛡️ Always fetch the absolute truth from the Database
            const response = await api.get('/api/orders/guest', {
                headers: { 'x-guest-id': guestSessionId }
            });
            return response.data;
        },
        enabled: !!guestSessionId,
        staleTime: 1000 * 60, // Consider data stale after 60 seconds
        refetchOnWindowFocus: true, // Auto-sync if the user leaves the tab and comes back
    });

    // ⚡ Real-Time Invalidation: When the socket fires, instantly refresh the DB query
    useEffect(() => {
        if (!venueId) return;

        const token = localStorage.getItem('guest_token') || localStorage.getItem('auth_token');
        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: token ? { token } : {}
        });

        socket.on('order:status_updated', () => {
            queryClient.invalidateQueries({ queryKey: ['guestOrders'] });
        });

        socket.on('payment:completed', () => {
            queryClient.invalidateQueries({ queryKey: ['guestOrders'] });
        });

        socket.on('order:cancelled', () => {
            queryClient.invalidateQueries({ queryKey: ['guestOrders'] });
        });

        return () => {
            socket.disconnect();
        };
    }, [venueId, queryClient]);

    return query;
};

// ============================================================================
// 2. SETTLE GUEST TAB MUTATION
// ============================================================================
export const useSettleGuestTab = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { orderIds: string[], settlement_method: string, phone?: string, provider?: string }) => {
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