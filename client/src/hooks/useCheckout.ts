import { useMutation } from '@tanstack/react-query';
import api from '../utils/axiosConfig';

// 🛡️ Exported Interfaces
export type PaymentMethod = 'M-PESA' | 'CASH' | 'CARD'; 

export interface GuestOrderPayload {
    venue_id: string;
    table_number: string;
    customer_name: string;
    payment_method: PaymentMethod;
    phone_number: string | null;
    amount: number;
    items: {
        item_id: string;
        quantity: number;
        price: number | string;
        name: string;
    }[];
}

export interface PaystackInitResponse {
    reference: string;
    access_code: string;
    authorization_url: string;
}

export type SubmitGuestOrderResponse = 
    | { status: 'success'; method: 'CASH'; orderId: string }
    | { status: 'pending'; method: 'M-PESA'; orderId: string }
    | { status: 'pending'; method: 'CARD'; orderId: string; access_code: string };

// ============================================================================
// ⚡ ORCHESTRATION MUTATION HOOK (POST)
// ============================================================================
export const useSubmitGuestOrder = () => {
    return useMutation({
        mutationFn: async (payload: GuestOrderPayload): Promise<SubmitGuestOrderResponse> => {
            
            // Step 1: Create the Order in the Database
            const orderRes = await api.post<{ orderId: string }>('/api/orders', payload);
            const orderId = orderRes.data.orderId;

            // Step 2a: Trigger STK Push Sequence
            if (payload.payment_method === 'M-PESA') {
                await api.post('/api/mpesa/stkpush', { orderId, phone: payload.phone_number });
                return { status: 'pending', method: 'M-PESA', orderId };
            }

            // Step 2b: Trigger Paystack Initialization Sequence
            if (payload.payment_method === 'CARD') {
                const initRes = await api.post<PaystackInitResponse>('/api/paystack/initialize', { orderId });
                return { status: 'pending', method: 'CARD', orderId, access_code: initRes.data.access_code };
            }

            // Step 2c: Standard Cash Sequence
            return { status: 'success', method: 'CASH', orderId };
        }
    });
};