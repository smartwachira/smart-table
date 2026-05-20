import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';
import { 
    ChefHat, CheckCircle2, AlertTriangle, Clock, 
    User, BellRing, Flame, ArrowRight, UtensilsCrossed, 
    Banknote, History, Lock, Search, AlertOctagon, Loader2, MonitorSmartphone, Hash
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useKdsStore } from '../../store/useKdsStore'; 

// ⚡ IMPORT CUSTOM HOOKS
import { 
    useLiveOrders, useUpdateOrderStatus, useCancelOrder, useCollectCash
} from '../../hooks/useLiveOrders';

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface CancelModalState {
    isOpen: boolean;
    orderId: string | null;
}

export default function LiveOrders() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // ⚡ ZUSTAND: Preserve tabs and search across unmounts
    const { activeTab, searchQuery, setActiveTab, setSearchQuery } = useKdsStore();

    const [cancelModal, setCancelModal] = useState<CancelModalState>({ isOpen: false, orderId: null });
    const [cancelReason, setCancelReason] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hooks
    // ============================================================================
    const { data: orders = [], isLoading, isError } = useLiveOrders(user?.venueId);
    
    const updateOrderStatusMutation = useUpdateOrderStatus();
    const cancelOrderMutation = useCancelOrder();
    const collectCashMutation = useCollectCash();

    useEffect(() => {
        audioRef.current = new Audio(BEEP_URL);
    }, []);

    // Play sound when new order arrives
    useEffect(() => {
        const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        if (activeOrders.length > previousOrderCount) {
            audioRef.current?.play().catch(e => console.log('Audio play failed:', e));
        }
        setPreviousOrderCount(activeOrders.length);
    }, [orders, previousOrderCount]);

    // ============================================================================
    // ⚡ WEBSOCKET INTEGRATION
    // ============================================================================
    useEffect(() => {
        if (!user?.venueId) return;
        
        const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
            auth: { token: localStorage.getItem('auth_token') }
        });

        socket.on('order:created', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));
        socket.on('order:status_updated', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));
        socket.on('order:cancelled', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));
        socket.on('payment:completed', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));

        return () => {
            socket.disconnect();
        };
    }, [user?.venueId, queryClient]);

    // ⚡ ENTERPRISE FIX: Restored Recall filtering logic
    const filteredOrders = orders.filter((order) => {
        const isCompletedOrCancelled = order.status === 'COMPLETED' || order.status === 'CANCELLED';
        
        // "all" tab should only show active queue. "COMPLETED" tab handles the history.
        let matchesTab = false;
        if (activeTab === 'all') {
            matchesTab = !isCompletedOrCancelled;
        } else if (activeTab === 'COMPLETED') {
            matchesTab = isCompletedOrCancelled;
        } else {
            matchesTab = order.status === activeTab;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
            (order.table_number || '').toLowerCase().includes(searchLower) ||
            (order.order_id || '').toLowerCase().includes(searchLower) ||
            (order.customer_name || '').toLowerCase().includes(searchLower);
            
        return matchesTab && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'PREPARING': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'READY': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'COMPLETED': return 'bg-slate-100 text-slate-500 border-slate-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getElapsedTimeMinutes = (createdAt: string) => {
        return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    };

    const getElapsedTimeString = (createdAt: string) => {
        const diff = getElapsedTimeMinutes(createdAt);
        return diff < 1 ? 'Just now' : `${diff}m ago`;
    };

    // ⚡ ENTERPRISE FIX: Restored SLA Time Shading
    const getSlaClasses = (createdAt: string, status: string, isTab: boolean) => {
        if (status === 'COMPLETED' || status === 'CANCELLED') {
            return 'border-slate-200 bg-slate-50 opacity-70'; // Dimmed for recall
        }
        
        const minutes = getElapsedTimeMinutes(createdAt);
        
        if (minutes >= 20) {
            return 'border-red-400 bg-red-50/30 shadow-md shadow-red-100'; // Critical
        } else if (minutes >= 10) {
            return 'border-amber-400 bg-amber-50/30 shadow-sm shadow-amber-100'; // Warning
        }
        
        // Normal state - Use Tab or Standard styling
        return isTab ? 'border-purple-200 shadow-purple-100 bg-white' : 'border-slate-100 shadow-sm bg-white';
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-slate-400 bg-slate-50">
                <ChefHat className="animate-bounce mb-4 text-indigo-500" size={48} />
                <p className="font-bold tracking-wide">Syncing KDS...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-red-400 bg-slate-50">
                <AlertTriangle size={48} className="mb-4" />
                <p className="font-bold">Connection lost. Reconnecting...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] animate-in fade-in duration-500 pb-24 md:pb-8">
            <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Kitchen Display
                        {orders.some(o => o.status === 'PENDING') && (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Manage live orders and fulfillment tracking.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search orders..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            {/* TAB NAVIGATION */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar">
                {[
                    { id: 'all', label: 'All Active', icon: Flame },
                    { id: 'PENDING', label: 'New Orders', icon: BellRing },
                    { id: 'PREPARING', label: 'Cooking', icon: ChefHat },
                    { id: 'READY', label: 'Ready for Pickup', icon: UtensilsCrossed },
                    // ⚡ ENTERPRISE FIX: Restored the Recall tab
                    { id: 'COMPLETED', label: 'Recall / History', icon: History } 
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    let count = 0;
                    if (tab.id === 'all') {
                        count = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                    } else if (tab.id === 'COMPLETED') {
                        count = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').length;
                    } else {
                        count = orders.filter(o => o.status === tab.id).length;
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`shrink-0 flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                isActive 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                            {tab.label}
                            <span className={`ml-1.5 px-2 py-0.5 rounded-md text-xs ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ORDERS GRID */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        {activeTab === 'COMPLETED' ? <History size={40} className="text-slate-300" /> : <CheckCircle2 size={40} className="text-slate-300" />}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                        {activeTab === 'COMPLETED' ? 'No recent history' : 'All caught up!'}
                    </h3>
                    <p className="text-slate-500 mt-2 max-w-sm">
                        {activeTab === 'COMPLETED' ? 'No orders have been completed yet during this shift.' : 'There are no active orders matching your current filter. Enjoy the breather.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredOrders.map((order) => {
                        // ⚡ SPRINT 20: OPEN TAB LOGIC 
                        const isTabOrder = order.payment_method === 'TAB' || (order.payment_status === 'PENDING' && order.payment_method !== 'CASH');
                        
                        // ⚡ ENTERPRISE FIX: Matrix styling (SLA Time + Payment Status)
                        const slaClasses = getSlaClasses(order.createdAt as string, order.status, isTabOrder);
                        const isDelayed = getElapsedTimeMinutes(order.createdAt as string) >= 10 && order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                        return (
                            <div key={order.order_id} className={`flex flex-col h-full rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all overflow-hidden ${slaClasses}`}>
                                {/* CARD HEADER (Money) */}
                                <div className={`px-4 py-3 md:px-5 md:py-4 flex justify-between items-center ${
                                    isTabOrder ? 'bg-purple-600 text-white' : 'bg-slate-900 text-white'
                                }`}>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80">
                                            {isTabOrder ? 'Verified Open Tab' : 'Paid Order'}
                                        </span>
                                        <span className="text-base md:text-xl font-black flex items-center gap-2">
                                            <Hash size={18} /> {order.table_number}
                                        </span>
                                    </div>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 border-white/20 ${isTabOrder ? 'bg-purple-500' : 'bg-white/10'}`}>
                                        {isTabOrder ? <Lock size={18} /> : <CheckCircle2 size={18} />}
                                    </div>
                                </div>

                                {/* CARD CONTENT */}
                                <div className="p-4 md:p-5 flex-1 flex flex-col">
                                    
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                            <User size={16} /> <span className="truncate max-w-[100px]">{order.customer_name}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 font-bold text-sm ${isDelayed ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
                                            <Clock size={16} /> {getElapsedTimeString(order.createdAt as string)}
                                        </div>
                                    </div>

                                    {/* ITEMS LIST */}
                                    <div className="space-y-3 mb-6 flex-1">
                                        {order.OrderItems?.map((item: any) => (
                                            <div key={item.order_item_id} className="flex justify-between items-start gap-3 p-3 bg-white/60 rounded-xl border border-slate-200/50">
                                                <div className="flex items-start gap-3">
                                                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{item.quantity}x</span>
                                                    <span className="font-bold text-slate-700 text-sm mt-0.5 leading-tight">{item.MenuItem?.name || 'Unknown Item'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* STATUS BADGE */}
                                    <div className={`inline-flex self-start items-center px-3 py-1.5 rounded-lg border text-xs font-black tracking-wide uppercase mb-4 ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                                        <div className="flex flex-col gap-2 mt-auto">
                                            {order.status === 'PENDING' && (
                                                <button 
                                                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.order_id, status: 'PREPARING' })}
                                                    disabled={updateOrderStatusMutation.isPending}
                                                    className="w-full py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm md:text-base rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                                >
                                                    Start Cooking <ArrowRight size={18} />
                                                </button>
                                            )}
                                            {order.status === 'PREPARING' && (
                                                <button 
                                                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.order_id, status: 'READY' })}
                                                    disabled={updateOrderStatusMutation.isPending}
                                                    className="w-full py-3 md:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm md:text-base rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                                                >
                                                    Mark Ready for Pickup <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            {order.status === 'READY' && (
                                                <button 
                                                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.order_id, status: 'COMPLETED' })}
                                                    disabled={updateOrderStatusMutation.isPending}
                                                    className="w-full py-3 md:py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm md:text-base rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md"
                                                >
                                                    Complete Order <CheckCircle2 size={18} />
                                                </button>
                                            )}

                                            {order.payment_method === 'CASH' && order.payment_status === 'PENDING' && (
                                                <button 
                                                    onClick={() => collectCashMutation.mutate(order.order_id)}
                                                    disabled={collectCashMutation.isPending}
                                                    className="w-full py-2.5 md:py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 font-bold text-xs md:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Banknote size={16} /> Collect {Number(order.total_amount).toLocaleString('en-KE')} KES Cash
                                                </button>
                                            )}

                                            {['MANAGER', 'OWNER'].includes(user?.role || '') && (
                                                <button 
                                                    onClick={() => setCancelModal({ isOpen: true, orderId: order.order_id })}
                                                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs md:text-sm rounded-xl transition-colors mt-2"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* RECALL INFO */}
                                    {order.status === 'CANCELLED' && (
                                        <div className="mt-auto p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                                            <span className="font-bold block mb-1">Cancellation Reason:</span>
                                            {order.notes || 'No reason provided.'}
                                        </div>
                                    )}
                                </div>
                                
                                {/* EXPLICIT FOOTER BADGE */}
                                <div className="px-4 py-3 bg-white/80 border-t border-slate-200/60 flex justify-between items-center backdrop-blur-sm">
                                    {isTabOrder ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase">
                                            <MonitorSmartphone size={12} /> Tab Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                                            <CheckCircle2 size={12} /> {order.payment_method === 'CASH' && order.payment_status === 'PENDING' ? 'Cash Pending' : 'Confirmed'}
                                        </span>
                                    )}
                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">#{order.order_id.slice(-6)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setCancelModal({ isOpen: false, orderId: null })}></div>
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <AlertOctagon size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Cancel Order?</h2>
                        <p className="text-slate-500 text-center text-sm mb-6">This action cannot be undone. The items will be removed from the active kitchen queue.</p>
                        
                        <div className="space-y-2 mb-8">
                            <label className="text-sm font-bold text-slate-700">Reason for cancellation</label>
                            <input 
                                type="text" 
                                placeholder="e.g., Customer changed mind"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2 md:gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, orderId: null })} className="flex-1 py-2.5 md:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm md:text-base font-bold rounded-xl transition-colors">Keep Order</button>
                            <button 
                                onClick={() => cancelOrderMutation.mutate(
                                    { orderId: cancelModal.orderId!, cancelReason },
                                    { 
                                        onSuccess: () => {
                                            setCancelModal({ isOpen: false, orderId: null });
                                            setCancelReason('');
                                        } 
                                    }
                                )} 
                                disabled={!cancelReason || cancelOrderMutation.isPending} 
                                className="flex-1 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm md:text-base font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                            >
                                {cancelOrderMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}