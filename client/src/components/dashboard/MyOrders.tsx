import React, { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import io, { Socket } from 'socket.io-client';
import { 
    CheckCircle2, Clock, Flame, ArrowRight, 
    Banknote, MonitorSmartphone, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyOrdersStore } from '../../store/useMyOrdersStore'; // ⚡ Global State

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// 🛡️ Strict typing for the order payload
interface OrderItem {
    name?: string;
    quantity: number;
    MenuItem?: {
        name: string;
    };
}

interface OrderData {
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

export default function MyOrders() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const token = localStorage.getItem('auth_token');
    
    // ⚡ ZUSTAND: Preserve tab state across unmounts
    const { activeTab, setActiveTab } = useMyOrdersStore();

    // ⚡ Refs for Audio Notifications
    const previousReadyRef = useRef<Set<string>>(new Set());

    const getConfig = () => ({
        headers: { Authorization: `Bearer ${token}` }
    });

    const playSound = useCallback(() => {
        try {
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e => console.log("Audio play blocked:", e));
        } catch (err) {
            console.error("Audio play failed", err);
        }
    }, []);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Server State & Polling Fallback
    // ============================================================================
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['myOrders', user?.userId],
        queryFn: async ({ signal }) => {
            const response = await axios.get<OrderData[]>('/api/orders/live', {
                ...getConfig(),
                signal
            });
            // Filter instantly to only show orders punched by this specific staff member
            return (response.data || []).filter(o => String(o.staff_id) === String(user?.userId));
        },
        enabled: !!user?.userId && !!token,
        refetchInterval: 10000 // Fallback polling
    });

    // ============================================================================
    // ⚡ NOTIFICATION EFFECT: Detect New 'READY' Orders
    // ============================================================================
    useEffect(() => {
        if (!orders.length) return;

        const currentReadyIds = new Set(orders.filter(o => o.status === 'READY').map(o => String(o.order_id)));
        let hasNewReady = false;

        if (previousReadyRef.current.size > 0) {
            currentReadyIds.forEach(id => {
                if (!previousReadyRef.current.has(id)) hasNewReady = true;
            });
        }

        if (hasNewReady) {
            playSound();
            toast.success('An order is Ready for Pickup!', { icon: '🛎️' });
        }

        previousReadyRef.current = currentReadyIds;
    }, [orders, playSound]);

    // ============================================================================
    // ⚡ WEBSOCKET INTEGRATION
    // ============================================================================
    useEffect(() => {
        if (!user?.venueId) return;

        const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
        socket.emit('join_venue', user.venueId);

        // Tell TanStack to instantly refetch when the kitchen updates a ticket
        socket.on('receive_order', () => queryClient.invalidateQueries({ queryKey: ['myOrders'] }));
        socket.on('orderUpdated', () => queryClient.invalidateQueries({ queryKey: ['myOrders'] }));

        return () => {
            socket.disconnect();
        };
    }, [user?.venueId, queryClient]);

    // ============================================================================
    // ⚡ TANSTACK MUTATIONS
    // ============================================================================
    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string, status: OrderData['status'] }) => {
            return axios.patch(`/api/orders/${orderId}/status`, { status }, getConfig());
        },
        onSuccess: (_, variables) => {
            toast.success(`Order marked as ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to update ticket.");
        }
    });

    const collectCashMutation = useMutation({
        mutationFn: async (orderId: string) => {
            return axios.patch(`/api/orders/${orderId}/collect-cash`, {}, getConfig());
        },
        onSuccess: () => {
            toast.success("Cash logged securely.");
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
        },
        onError: () => {
            toast.error("Failed to log cash.");
        }
    });

    // ============================================================================
    // DERIVED DATA & RENDERERS
    // ============================================================================
    const readyOrders = orders.filter(o => o.status === 'READY');
    const cookingOrders = orders.filter(o => ['PENDING', 'PREPARING'].includes(o.status));
    const completedOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

    if (isLoading && !orders.length) {
        return (
            <div className="flex h-[calc(100dvh-80px)] items-center justify-center bg-slate-50 text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <MonitorSmartphone size={48} className="mb-4 text-indigo-300" />
                    <p className="font-bold">Loading Your Tickets...</p>
                </div>
            </div>
        );
    }

    const OrderCard: React.FC<{ order: OrderData }> = ({ order }) => {
        const isCashPending = order.payment_method === 'CASH' && order.payment_status === 'PENDING';
        
        return (
            <div className={`bg-white rounded-2xl border-2 p-4 shadow-sm mb-4 transition-all ${order.status === 'READY' ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{order.table_number || 'Takeaway'}</h3>
                        <p className="text-xs font-bold text-slate-500">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'READY' ? 'bg-emerald-100 text-emerald-700' : 
                            order.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {order.status}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
                    {order.OrderItems?.map((item, idx) => (
                        <div key={idx} className="flex gap-2 text-sm">
                            <span className="font-black text-slate-400">{item.quantity}x</span>
                            <span className="font-bold text-slate-800">{item.MenuItem?.name || item.name}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    {isCashPending && (
                        <button 
                            onClick={() => {
                                if (window.confirm("Confirm you have received the cash for this order?")) {
                                    collectCashMutation.mutate(order.order_id);
                                }
                            }}
                            disabled={collectCashMutation.isPending}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                        >
                            {collectCashMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16}/>}
                            Collect {Number(order.total_amount).toLocaleString()} KES
                        </button>
                    )}
                    
                    {order.status === 'READY' && (
                        <button 
                            disabled={isCashPending || updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ orderId: order.order_id, status: 'COMPLETED' })}
                            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                isCashPending 
                                ? 'bg-slate-200 text-slate-400' 
                                : 'bg-emerald-500 text-white active:scale-95 shadow-md shadow-emerald-200'
                            }`}
                        >
                            {updateStatusMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
                            Mark as Delivered
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto p-4 min-h-[calc(100dvh-80px)] bg-slate-100 animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">My Orders</h1>
            <p className="text-sm text-slate-500 font-medium mb-6">Track tickets you punched in.</p>

            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 mb-6 shrink-0">
                <button onClick={() => setActiveTab('READY')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'READY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                    <ArrowRight size={16} /> Pick Up ({readyOrders.length})
                </button>
                <button onClick={() => setActiveTab('COOKING')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'COOKING' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>
                    <Flame size={16} /> Kitchen ({cookingOrders.length})
                </button>
                <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                    <Clock size={16} /> Done
                </button>
            </div>

            <div>
                {activeTab === 'READY' && (
                    readyOrders.length === 0 ? <p className="text-center text-slate-400 font-bold mt-10">No orders waiting for pickup.</p> 
                    : readyOrders.map(o => <OrderCard key={o.order_id} order={o} />)
                )}
                {activeTab === 'COOKING' && (
                    cookingOrders.length === 0 ? <p className="text-center text-slate-400 font-bold mt-10">Kitchen is clear!</p> 
                    : cookingOrders.map(o => <OrderCard key={o.order_id} order={o} />)
                )}
                {activeTab === 'HISTORY' && (
                    completedOrders.length === 0 ? <p className="text-center text-slate-400 font-bold mt-10">No history for this shift.</p> 
                    : completedOrders.map(o => <OrderCard key={o.order_id} order={o} />)
                )}
            </div>
        </div>
    );
}