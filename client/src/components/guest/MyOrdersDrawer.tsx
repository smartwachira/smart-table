import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { X, Receipt, ChefHat, BellRing, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useGuestSessionStore } from '../../store/useGuestSessionStore';

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { useGuestOrders } from '../../hooks/useGuestOrders';

interface MyOrdersDrawerProps {
    isOpen: boolean;
    onOpen: () => void; 
    onClose: () => void;
    venueId: string | null;
}

const statusConfig = {
    PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Received' },
    PREPARING: { icon: ChefHat, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cooking' },
    READY: { icon: BellRing, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Ready for Table' },
    COMPLETED: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Served' },
    CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
};

export default function MyOrdersDrawer({ isOpen, onOpen, onClose, venueId }: MyOrdersDrawerProps) {
    const queryClient = useQueryClient();
    const guestSessionId = useGuestSessionStore((state) => state.guestSessionId);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hook
    // ============================================================================
    const { data: orders, isLoading, error } = useGuestOrders(guestSessionId);

    // ============================================================================
    // ⚡ REAL-TIME SYNC: Listen to Kitchen Updates
    // ============================================================================
    useEffect(() => {
        if (!venueId) return;

        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socket.emit('join_venue', venueId);

        socket.on('orderUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['guestOrders', guestSessionId] });
        });

        return () => {
            socket.off('orderUpdated');
            socket.disconnect();
        };
    }, [venueId, queryClient, guestSessionId]);

    // ============================================================================
    // ⚡ CLOSED STATE UX: The Floating Tracking Pill
    // ============================================================================
    if (!isOpen) {
        if (!orders || orders.length === 0) return null;
        
        // Filter out old/finished orders for the preview badge
        const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        if (activeOrders.length === 0) return null;

        // Calculate aggregate data for the badge
        const totalActiveItems = activeOrders.reduce((acc, order) => acc + order.OrderItems.reduce((sum, item) => sum + item.quantity, 0), 0);
        const itemNamesPreview = activeOrders.flatMap(o => o.OrderItems.map(i => i.MenuItem?.name)).filter(Boolean);
        const previewText = [...new Set(itemNamesPreview)].slice(0, 2).join(', ') + (itemNamesPreview.length > 2 ? '...' : '');

        return (
            <div className="fixed bottom-24 right-4 z-40 animate-in slide-in-from-bottom-5 fade-in duration-500">
                <button 
                    onClick={onOpen}
                    className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
                >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center relative">
                        <Clock size={16} className="text-white animate-spin-slow" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                            {activeOrders.length}
                        </span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-black tracking-tight">{totalActiveItems} Items Cooking</span>
                        <span className="text-[10px] font-medium text-slate-300 truncate max-w-[120px]">{previewText}</span>
                    </div>
                </button>
            </div>
        );
    }

    // ============================================================================
    // ⚡ OPEN STATE UX: The Slide-over Drawer
    // ============================================================================
    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:flex-row">
            {/* Backdrop Blur overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Slide-over Drawer UI */}
            <div className="relative w-full md:w-[400px] h-[85dvh] md:h-[100dvh] bg-slate-50 shadow-2xl flex flex-col rounded-t-[2rem] md:rounded-none animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
                
                <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between rounded-t-[2rem] md:rounded-none sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <Receipt size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">My Tab</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar pb-24">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <Clock size={32} className="animate-spin mb-4 text-indigo-400" />
                            <p className="font-bold tracking-widest uppercase text-xs">Loading Tab...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-500 mb-2" />
                            <p className="text-red-800 font-medium text-sm">Failed to load your orders. Please check your connection.</p>
                        </div>
                    ) : !orders || orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                            <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                                <Receipt size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">No active orders</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1 max-w-[250px]">Items you order during this session will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const config = statusConfig[order.status] || statusConfig['PENDING'];
                                const StatusIcon = config.icon;

                                return (
                                    <div key={order.order_id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                        
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                                                    <StatusIcon size={16} className={order.status === 'PREPARING' || order.status === 'READY' ? 'animate-pulse' : ''} />
                                                </div>
                                                <span className={`text-sm font-black tracking-wider uppercase ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {order.OrderItems && order.OrderItems.map((item, idx) => {
                                                const itemName = item.MenuItem?.name || 'Unknown Item';
                                                const itemPrice = Number(item.price_at_time || 0);
                                                const lineTotal = itemPrice * item.quantity;

                                                return (
                                                    <div key={idx} className="flex justify-between items-start text-sm">
                                                        <div className="flex gap-2 text-slate-700">
                                                            <span className="font-black text-slate-900">{item.quantity}x</span>
                                                            <span className="font-medium">{itemName}</span>
                                                        </div>
                                                        <span className="text-slate-500 font-semibold">
                                                            {lineTotal.toLocaleString('en-KE')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 px-5 py-3">
                                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Order Total</span>
                                            <span className="text-lg font-black text-slate-900">
                                                {Number(order.total_amount).toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
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