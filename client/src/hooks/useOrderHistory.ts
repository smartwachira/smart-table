import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface OrderItem {
    quantity: number;
    price_at_time: number;
    name?: string;
    notes?: string;
    MenuItem?: { name: string; };
}

export interface HistoryOrderData {
    order_id: string;
    table_number: string;
    customer_name?: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    payment_status: 'PENDING' | 'PAID' | 'FAILED';
    payment_method: 'CASH' | 'M-PESA' | string;
    total_amount: number | string;
    createdAt?: string;
    notes?: string;
    CashCollector?: { name: string };
    OrderItems: OrderItem[];
}

// ⚡ Encapsulated Date Logic
const getDateParams = (preset: string, customStart: string, customEnd: string) => {
    const now = new Date();
    let startDateObj = new Date();
    let endDateObj = new Date(now);

    if (preset === 'custom' && customStart && customEnd) {
        startDateObj = new Date(customStart); startDateObj.setHours(0,0,0,0);
        endDateObj = new Date(customEnd); endDateObj.setHours(23,59,59,999);
    } else {
        switch (preset) {
            case 'yesterday':
                startDateObj.setDate(now.getDate() - 1); startDateObj.setHours(0,0,0,0);
                endDateObj = new Date(startDateObj); endDateObj.setHours(23,59,59,999);
                break;
            case '7days': startDateObj.setDate(now.getDate() - 7); break;
            case 'thisMonth': startDateObj = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'lastMonth':
                startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDateObj = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'ytd': startDateObj = new Date(now.getFullYear(), 0, 1); break;
            default: startDateObj.setHours(0,0,0,0); // Today
        }
    }
    return { startDateStr: startDateObj.toISOString(), endDateStr: endDateObj.toISOString() };
};

// ⚡ THE CUSTOM HOOK
export const useOrderHistory = (preset: string, customStart: string, customEnd: string) => {
    return useQuery({
        queryKey: ['orderHistory', preset, customStart, customEnd],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error("No token");
            
            const { startDateStr, endDateStr } = getDateParams(preset, customStart, customEnd);
            const response = await axios.get<HistoryOrderData[]>('/api/orders/history', {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate: startDateStr, endDate: endDateStr }
            });
            return response.data || [];
        },
        enabled: !!localStorage.getItem('auth_token'),
        placeholderData: keepPreviousData // ⚡ Smooth UX: Doesn't flash loading spinner when changing dates
    });
};