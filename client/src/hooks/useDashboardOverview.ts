import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';

// 🛡️ Exported Interfaces
export interface KPITrend { percentage: string | number; isPositive: boolean; }
export interface KPIMetric { value: number; trend: KPITrend; }
export interface LivePulse { activeOrders: number; averageFulfillmentTime: string | number; }
export interface SalesTrend { timeLabel: string; currentRevenue: number; previousRevenue: number; currentOrders: number; previousOrders: number; }
export interface PaymentBreakdown { name: string; value: number | string; }
export interface CategoryBreakdown { category: string; total_sold: number | string; revenue: number | string; }
export interface TopItem { name: string; total_sold: number | string; total_revenue: number | string; }

export interface DashboardData {
    granularity: 'hour' | 'day' | 'month';
    kpis: { revenue: KPIMetric; orders: KPIMetric; aov: KPIMetric; };
    livePulse: LivePulse;
    salesTrends: SalesTrend[];
    paymentBreakdown: PaymentBreakdown[];
    categoryBreakdown: CategoryBreakdown[];
    topItems: TopItem[];
}

// ⚡ Encapsulated Date Logic
const getDateParams = (preset: string, customStart: string, customEnd: string) => {
    let startDateStr: string | null = null; 
    let endDateStr: string | null = null;
    const now = new Date();
    let tempStart = new Date();

    if (preset === 'custom' && customStart && customEnd) {
        const startObj = new Date(customStart); startObj.setHours(0,0,0,0);
        const endObj = new Date(customEnd); endObj.setHours(23,59,59,999);
        return { startDate: startObj.toISOString(), endDate: endObj.toISOString() };
    }

    switch (preset) {
        case 'yesterday':
            tempStart.setDate(now.getDate() - 1); tempStart.setHours(0,0,0,0);
            startDateStr = tempStart.toISOString();
            let tempEnd = new Date(tempStart); tempEnd.setHours(23,59,59,999);
            endDateStr = tempEnd.toISOString();
            break;
        case '7days':
            tempStart.setDate(now.getDate() - 7);
            startDateStr = tempStart.toISOString(); endDateStr = now.toISOString();
            break;
        case 'thisMonth':
            startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            endDateStr = now.toISOString();
            break;
        case 'lastMonth':
            startDateStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            endDateStr = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
            break;
        case 'ytd':
            startDateStr = new Date(now.getFullYear(), 0, 1).toISOString();
            endDateStr = now.toISOString();
            break;
        default: break; // 'shift' leaves params empty for backend default
    }
    return { startDate: startDateStr, endDate: endDateStr };
};

// ⚡ THE CUSTOM HOOK
export const useDashboardOverview = (venueId: string | undefined, preset: string, customStart: string, customEnd: string) => {
    return useQuery({
        queryKey: ['dashboardOverview', venueId, preset, customStart, customEnd],
        queryFn: async () => {
            const { startDate, endDate } = getDateParams(preset, customStart, customEnd);
            const params: Record<string, string> = {};
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            const res = await axios.get<DashboardData>(`/api/dashboard/overview`, {
                params,
                headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
                venueId 
            } as any);

            if (typeof res.data === 'string' && (res.data as string).includes('<!DOCTYPE html>')) {
                throw new Error("Received HTML instead of JSON. The backend route is not mounted.");
            }
            return res.data;
        },
        enabled: !!venueId,
        refetchInterval: 60000, 
        placeholderData: keepPreviousData, // ⚡ Holds old chart data on screen while fetching new dates!
    });
};