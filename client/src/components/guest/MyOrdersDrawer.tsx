import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { X, Receipt, ChefHat, BellRing, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import api from '../../utils/axiosConfig'; // ⚡ Global Interceptor auto-attaches x-guest-id
import { useGuestSessionStore } from '../../store/useGuestSessionStore';

// 🛡️ Strict Typing for the payload
interface OrderItem {
    name: string;
    quantity: number;
    price: string | number;
}

interface Order {
    order_id: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    amount: string | number;
    createdAt: string;
    OrderItems: OrderItem[];
}

interface MyOrdersDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    venueId: string | null;
}

export default function MyOrdersDrawer({ isOpen, onClose, venueId }: MyOrdersDrawerProps) {
    const queryClient = useQueryClient();
    const guestSessionId = useGuestSessionStore((state) => state.guestSessionId);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Fetch Historical Session Orders
    // ============================================================================
    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['guestOrders', guestSessionId],
        queryFn: async () => {
            const res = await api.get<Order[]>('/api/orders/guest');
            return res.data;
        },
        enabled: isOpen && !!guestSessionId, // Only fetch when the drawer is opened
        refetchInterval: 15000, // Background poll fallback for dropped WebSockets
    });

    // ============================================================================
    // ⚡ REAL-TIME SYNC: Listen to Kitchen Updates
    // ============================================================================
    useEffect(() => {
        if (!isOpen || !venueId) return;

        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socket.emit('join_venue', venueId);

        socket.on('orderUpdated', (data: { orderId: string; status: string }) => {
            // Silently refetch the orders list to update the UI instantly
            queryClient.invalidateQueries({ queryKey: ['guestOrders', guestSessionId] });
        });

        return () => {
            socket.off('orderUpdated');
            socket.disconnect();
        };
    }, [isOpen, venueId, queryClient, guestSessionId]);

    // UI Configuration for Order Statuses
    const statusConfig = {
        PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Received' },
        PREPARING: { icon: ChefHat, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cooking' },
        READY: { icon: BellRing, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Ready for Table' },
        COMPLETED: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Served' },
        CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
    };

    // If drawer is closed, render nothing
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Slide-over Drawer */}
            <div className="relative w-full max-w-md bg-slate-50 h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300 rounded-t-3xl md:rounded-none">
                
                {/* Header */}
                <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between rounded-t-3xl md:rounded-none sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <Receipt size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">My Tab</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-full flex items-center justify-center transition-colors active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <Clock size={32} className="animate-spin mb-4" />
                            <p className="font-bold tracking-widest uppercase text-xs">Loading Tab...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-500 mb-2" />
                            <p className="text-red-800 font-medium text-sm">Failed to load your orders. Please check your connection.</p>
                        </div>
                    ) : !orders || orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                                <Receipt size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">No active orders</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1">Items you order will appear here so you can track them.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-20">
                            {orders.map((order) => {
                                const config = statusConfig[order.status];
                                const StatusIcon = config.icon;

                                return (
                                    <div key={order.order_id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                        
                                        {/* Status Header */}
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                                                    <StatusIcon size={16} className={order.status === 'PREPARING' || order.status === 'READY' ? 'animate-pulse' : ''} />
                                                </div>
                                                <span className={`text-sm font-black tracking-wide uppercase ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* Order Items */}
                                        <div className="space-y-2 mb-4">
                                            {order.OrderItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-start text-sm">
                                                    <div className="flex gap-2 text-slate-700">
                                                        <span className="font-black text-slate-900">{item.quantity}x</span>
                                                        <span className="font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="text-slate-500 font-semibold">
                                                        {(Number(item.price) * item.quantity).toLocaleString('en-KE')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Total Footer */}
                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Order Total</span>
                                            <span className="text-lg font-black text-slate-900">
                                                {Number(order.amount).toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}