import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface POSCategory {
    category_id: string;
    name: string;
    is_active?: boolean;
}

export interface POSItem {
    item_id: string;
    name: string;
    price: number | string;
    category_id: string;
    image_url?: string;
    is_available?: boolean;
}

export type PaymentMethodType = 'CASH' | 'M-PESA' | 'CARD';

export type SubmitOrderResponse = 
    | { status: 'success'; orderId?: string }
    | { status: 'mpesa_sent'; orderId: string }
    | { status: 'card_init'; access_code: string; orderId: string; reference: string; }; 

export interface SubmitOrderPayload {
    cartItems: any[];
    paymentMethod: PaymentMethodType;
    customerName: string;
    tableNumber: string;
    phoneNumber?: string;
}

// ⚡ HELPER: Centralized image URL parsing
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================================
// ⚡ 1. FETCH HOOKS (GET)
// ============================================================================

export const usePOSCategories = (venueId?: string) => {
    return useQuery({
        queryKey: ['categories', venueId],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/menu/categories/venue/${venueId}`, getConfig());
            const catsArray = Array.isArray(res.data) ? res.data : (res.data.categories || []);
            return catsArray.filter((c: POSCategory) => c.is_active !== false);
        },
        enabled: !!venueId && !!getToken()
    });
};

export const usePOSItems = (venueId?: string) => {
    return useQuery({
        queryKey: ['menuItems', venueId],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/menu/items/venue/${venueId}`, getConfig());
            const itemsArray = Array.isArray(res.data) ? res.data : (res.data.items || []);
            return itemsArray.filter((i: POSItem) => i.is_available !== false);
        },
        enabled: !!venueId && !!getToken()
    });
};

// ============================================================================
// ⚡ 2. ORCHESTRATION MUTATION HOOK (POST)
// ============================================================================

export const useSubmitPOSOrder = () => {
    return useMutation({
        mutationFn: async (payload: SubmitOrderPayload): Promise<SubmitOrderResponse> => {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Step 1: Create the Order in the Database
            const orderRes = await axios.post<{ orderId: string }>(
                `${API_URL}/api/orders`, 
                {
                    items: payload.cartItems,
                    payment_method: payload.paymentMethod,
                    customer_name: payload.customerName,
                    table_number: payload.tableNumber,
                    phone_number: payload.paymentMethod === 'M-PESA' ? payload.phoneNumber : undefined,
                }, 
                { headers }
            );

            const orderId = orderRes.data.orderId;

            // Step 2a: Trigger STK Push Sequence via Paystack (Global Telco Support)
            if (payload.paymentMethod === 'M-PESA') {
                await axios.post(
                    `${API_URL}/api/paystack/charge-mobile-money`,
                    { 
                        orderId, 
                        phone: payload.phoneNumber,
                        provider: 'mpesa' // ⚡ Dynamic channel mapping
                    },
                    { headers }
                );
                return { status: 'mpesa_sent', orderId }; 
            }

            // Step 2b: Trigger Paystack Initialization Sequence (Cards/Bank)
            if (payload.paymentMethod === 'CARD') {
                const initRes = await axios.post<{ access_code: string, reference: string }>(
                    `${API_URL}/api/paystack/initialize`,
                    { orderId },
                    { headers }
                );
                return { status: 'card_init', access_code: initRes.data.access_code, reference: initRes.data.reference, orderId }; 
            }

            // Step 2c: Standard Cash Sequence
            return { status: 'success', orderId };
        }
    });
};