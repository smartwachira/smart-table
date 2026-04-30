import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import io, { Socket } from 'socket.io-client';
import { 
    ChefHat, CheckCircle2, Ban, AlertTriangle, Clock, 
    User, BellRing, Flame, ArrowRight, UtensilsCrossed, 
    Banknote, History, RotateCcw, Lock, Search, AlertOctagon,Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useKdsStore } from '../../store/useKdsStore'; // ⚡ Global UI State

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// 🛡️ Strict typing
interface OrderItem {
    name?: string;
    quantity: number;
    notes?: string;
    MenuItem?: {
        name: string;
        description?: string;
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
    createdAt?: string;
    created_at?: string;
    notes?: string;
    CashCollector?: { name: string };
    OrderItems: OrderItem[];
}

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

    // Local transient state
    const [cancelModal, setCancelModal] = useState<CancelModalState>({ isOpen: false, orderId: null });
    const [cancelReason, setCancelReason] = useState<string>('');
    
    const previousOrderIdsRef = useRef<Set<string>>(new Set());
    const newOrderScrollRef = useRef<HTMLDivElement>(null);

    const userRole = user?.role || 'STAFF';
    const token = localStorage.getItem('auth_token');

    const getConfig = () => ({
        headers: { Authorization: `Bearer ${token}` }
    });

    const playSound = useCallback(() => {
        try {
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e => console.log("Audio play blocked by browser policy:", e));
        } catch (err) {
            console.error("Audio play failed", err);
        }
    }, []);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Server State & Polling Fallback
    // ============================================================================
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['liveOrders', user?.venueId],
        queryFn: async () => {
            if (!token) { navigate('/login'); throw new Error("No token"); }
            const response = await axios.get<OrderData[]>('/api/orders/live', getConfig());
            return response.data || [];
        },
        enabled: !!user?.venueId && !!token,
        refetchInterval: 10000 // Fallback polling in case WebSockets drop
    });

    // ============================================================================
    // ⚡ NEW ORDER DETECTION (Audio Beep & Scroll)
    // ============================================================================
    useEffect(() => {
        if (!orders.length) return;
        
        const currentIds = new Set(orders.map(o => String(o.order_id)));
        let hasNewOrder = false;

        if (previousOrderIdsRef.current.size > 0) {
            currentIds.forEach(id => {
                if (!previousOrderIdsRef.current.has(id)) hasNewOrder = true;
            });
        }

        if (hasNewOrder) {
            playSound();
            toast.success('New Order Arrived!', { icon: '🛎️' });
            setActiveTab('PENDING'); 
            if (newOrderScrollRef.current) {
                newOrderScrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
            }
        }

        previousOrderIdsRef.current = currentIds;
    }, [orders, playSound, setActiveTab]);

    // ============================================================================
    // ⚡ WEBSOCKET INTEGRATION: Smart Cache Invalidation
    // ============================================================================
    useEffect(() => {
        if (!user?.venueId) return;
        
        const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
        socket.emit('join_venue', user.venueId);

        // When a socket event fires, tell TanStack to fetch fresh data instantly
        socket.on('receive_order', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));
        socket.on('orderUpdated', () => queryClient.invalidateQueries({ queryKey: ['liveOrders'] }));

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
            toast.success(`Ticket advanced to ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to advance ticket.");
        }
    });

    const cancelOrderMutation = useMutation({
        mutationFn: async () => {
            if (!cancelModal.orderId) throw new Error("No order selected");
            return axios.patch(`/api/orders/${cancelModal.orderId}/status`, 
                { status: 'CANCELLED', cancelReason }, 
                getConfig()
            );
        },
        onSuccess: () => {
            toast.success("Order Cancelled");
            setCancelModal({ isOpen: false, orderId: null });
            setCancelReason('');
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: () => toast.error("Failed to cancel order.")
    });

    const collectCashMutation = useMutation({
        mutationFn: async (orderId: string) => {
            return axios.patch(`/api/orders/${orderId}/collect-cash`, {}, getConfig());
        },
        onSuccess: () => {
            toast.success("Cash collection logged successfully.");
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
        onError: () => toast.error("Failed to log cash collection.")
    });

    // ============================================================================
    // DERIVED DATA & RENDERERS
    // ============================================================================
    const getElapsedMinutes = (timestamp?: string) => {
        if (!timestamp) return 0;
        const created = new Date(timestamp);
        return Math.floor((new Date().getTime() - created.getTime()) / 60000);
    };

    const filteredOrders = orders.filter(order => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const shortId = order.order_id ? String(order.order_id).slice(0, 4).toLowerCase() : '';
        const fullId = order.order_id ? String(order.order_id).toLowerCase() : '';
        const customer = order.customer_name ? String(order.customer_name).toLowerCase() : '';
        const table = order.table_number ? String(order.table_number).toLowerCase() : '';
        const itemNames = order.OrderItems ? order.OrderItems.map(i => (i.MenuItem?.name || i.name || '').toLowerCase()).join(' ') : '';

        return shortId.includes(query) || fullId.includes(query) || customer.includes(query) || table.includes(query) || itemNames.includes(query);
    });

    const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING');
    const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING');
    const readyOrders = filteredOrders.filter(o => o.status === 'READY');
    const recallOrders = filteredOrders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

    if (isLoading && !orders.length) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <ChefHat className="animate-bounce text-indigo-600 w-12 h-12 md:w-16 md:h-16 mb-4" />
                <h2 className="text-lg md:text-xl font-bold text-slate-700 tracking-tight">Syncing Kitchen Display...</h2>
            </div>
        );
    }

    const OrderTicket: React.FC<{ order: OrderData, isFirst?: boolean, isRecall?: boolean }> = ({ order, isFirst, isRecall = false }) => {
        const elapsedMins = getElapsedMinutes(order.createdAt || order.created_at);
        const isCashPending = order.payment_method === 'CASH' && order.payment_status === 'PENDING';
        const isPaymentPending = order.payment_status === 'PENDING';
        const isCancelled = order.status === 'CANCELLED';
        
        const shortOrderId = order.order_id ? String(order.order_id).slice(0, 4).toUpperCase() : 'N/A';
        
        let slaColor = 'bg-white border-slate-200';
        let headerColor = 'bg-slate-50 text-slate-700';
        let timeColor = 'text-slate-500';
        let isExtremeOverdue = false;

        if (isRecall) {
            slaColor = isCancelled ? 'bg-slate-50 border-red-200 opacity-70' : 'bg-slate-50 border-slate-200 opacity-80';
            headerColor = isCancelled ? 'bg-red-50 text-red-500 line-through' : 'bg-slate-200 text-slate-500';
        } else if (order.status !== 'READY') {
            if (elapsedMins >= 120) { 
                isExtremeOverdue = true;
                slaColor = 'bg-red-50 border-red-500 shadow-red-200 animate-pulse-slow border-4';
                headerColor = 'bg-red-600 text-white';
                timeColor = 'text-red-100 font-black';
            } else if (elapsedMins >= 20) {
                slaColor = 'bg-red-50 border-red-300 shadow-red-100';
                headerColor = 'bg-red-500 text-white';
                timeColor = 'text-red-100 font-black animate-pulse';
            } else if (elapsedMins >= 10) {
                slaColor = 'bg-amber-50 border-amber-300';
                headerColor = 'bg-amber-400 text-amber-950';
                timeColor = 'text-amber-800 font-black';
            }
        }

        return (
            <div ref={isFirst ? newOrderScrollRef : null} className={`flex flex-col rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md shrink-0 relative ${slaColor}`}>
                
                {isExtremeOverdue && (
                    <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 flex items-center justify-center gap-2">
                        <AlertOctagon size={12} /> Orphaned Ticket Alert <AlertOctagon size={12} />
                    </div>
                )}

                <div className={`p-3 md:p-4 flex justify-between items-start ${headerColor}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Table / Tab</span>
                            <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded font-black tracking-wider opacity-90">
                                #{shortOrderId}
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black mb-1 leading-none">{order.table_number || 'Takeaway'}</h3>
                        <div className="flex items-center gap-1 text-xs font-bold opacity-90">
                            <User size={12} /> {order.customer_name || 'Guest'}
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className={`flex items-center justify-end gap-1 text-xs md:text-sm ${timeColor}`}>
                            <Clock size={12} className="md:w-3.5 md:h-3.5" />
                            {isRecall 
                                ? (isCancelled ? 'Cancelled' : 'Served') 
                                : (elapsedMins > 120 ? `${Math.floor(elapsedMins/60)}hrs` : `${elapsedMins}m`)
                            }
                        </div>
                        {isCancelled && <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-2 rounded-full mt-1">Voided</span>}
                    </div>
                </div>

                <div className="px-3 md:px-4 py-2 border-b border-slate-100 bg-white/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Total: {Number(order.total_amount).toLocaleString('en-KE')} KES</span>
                    {isCashPending && !isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider animate-pulse">
                            <Banknote size={12} /> Collect Cash
                        </span>
                    ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider ${isCancelled ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            {isCancelled ? <Ban size={12}/> : <CheckCircle2 size={12} /> }
                            {isCancelled ? 'Void' : (order.payment_method === 'CASH' ? `Cash by ${order.CashCollector?.name || 'Staff'}` : `Paid (${order.payment_method})`)}
                        </span>
                    )}
                </div>

                <div className={`p-3 md:p-4 flex-1 space-y-3 bg-white/40 ${isCancelled ? 'grayscale opacity-50' : ''}`}>
                    {order.OrderItems?.map((item, idx) => (
                        <div key={idx} className="flex gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="font-black text-base md:text-lg text-slate-400 leading-none">{item.quantity}x</span>
                            <div>
                                <span className={`font-bold text-sm md:text-base ${isRecall ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {item.MenuItem?.name || item.name}
                                </span>
                                {(item.notes || item.MenuItem?.description) && (
                                    <p className="text-[10px] md:text-xs font-bold text-red-600 mt-0.5 pl-2 border-l-2 border-red-200">
                                        Note: {item.notes || item.MenuItem?.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isCancelled && order.notes && (
                         <div className="mt-4 p-2 bg-red-50 border border-red-100 rounded text-[10px] font-bold text-red-600">
                             {order.notes}
                         </div>
                    )}
                </div>
                
                {!isCancelled && (
                    <div className="p-2 md:p-3 bg-white/60 border-t border-slate-100 flex flex-col gap-2">
                        {isCashPending && ['MANAGER', 'OWNER', 'STAFF'].includes(userRole) && (
                            <button 
                                onClick={() => {
                                    if(window.confirm("Confirm you have received the cash for this order?")) {
                                        collectCashMutation.mutate(order.order_id);
                                    }
                                }}
                                disabled={collectCashMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-black text-white py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                <Banknote size={16} /> Log Cash Collection
                            </button>
                        )}

                        <div className="flex gap-2">
                            {order.status === "PENDING" && (
                                <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 md:py-3 px-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.order_id, status: 'PREPARING' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    <Flame size={16} /> Start Cooking
                                </button>
                            )}
                            {order.status === "PREPARING" && (
                                <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 md:py-3 px-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.order_id, status: 'READY' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    <CheckCircle2 size={16}/> Mark Ready
                                </button>
                            )}
                            {order.status === "READY" && (
                                <button 
                                    disabled={isPaymentPending || updateStatusMutation.isPending}
                                    className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 px-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm ${
                                        isPaymentPending 
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                            : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                                    }`}
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.order_id, status: 'COMPLETED' })}
                                >
                                    {isPaymentPending ? <><Lock size={16}/> Pending Payment</> : <><UtensilsCrossed size={16}/> Complete</>}
                                </button>
                            )}
                            {isRecall && (
                                <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 md:py-3 px-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.order_id, status: 'READY' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    <RotateCcw size={16}/> Undo
                                </button>
                            )}
                            
                            {!isRecall && ['MANAGER','OWNER'].includes(userRole) && (
                                <button 
                                    className="flex items-center justify-center p-2 md:p-3 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shrink-0"
                                    title='Cancel Order'
                                    onClick={() => setCancelModal({ isOpen: true, orderId: order.order_id })}
                                >
                                    <Ban size={18} className="md:w-5 md:h-5"/>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-[1800px] mx-auto p-3 md:p-6 lg:h-[100dvh] flex flex-col bg-slate-100 overflow-hidden">
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 mb-4 shrink-0 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2 md:gap-3 tracking-tight">
                        Kitchen Display System 
                        <span className="flex h-2.5 w-2.5 md:h-3 md:w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-emerald-500"></span>
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm mt-0.5 md:mt-1">Shift-Based FIFO Management</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center w-full xl:w-auto gap-4">
                    <div className="relative w-full sm:w-[300px] lg:w-[350px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ticket #, table, or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                        />
                    </div>

                    <div className="hidden md:flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div> Standard</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> &gt; 10m</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> &gt; 20m</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-700"><div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div> &gt; 2hr (Orphan)</div>
                    </div>
                </div>
            </div>

            <div className="flex lg:hidden bg-slate-200/50 p-1.5 rounded-2xl gap-1 mb-4 overflow-x-auto custom-scrollbar snap-x shrink-0">
                {[
                    { id: 'PENDING', label: 'New', count: pendingOrders.length, icon: BellRing, color: 'text-amber-600' },
                    { id: 'PREPARING', label: 'Cooking', count: preparingOrders.length, icon: Flame, color: 'text-indigo-600' },
                    { id: 'READY', label: 'Ready', count: readyOrders.length, icon: ArrowRight, color: 'text-emerald-600' },
                    { id: 'COMPLETED', label: 'Recall', count: recallOrders.length, icon: History, color: 'text-slate-600' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all snap-center ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        <tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} /> 
                        {tab.label} 
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300 m-2 min-h-[50vh]">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 md:mb-6">
                        <Search className="w-8 h-8 md:w-12 md:h-12" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-1 md:mb-2">No tickets found</h2>
                    <p className="text-sm md:text-base text-slate-500 font-medium text-center px-4">
                        {searchQuery ? `No orders match "${searchQuery}"` : "Waiting for new orders to arrive..."}
                    </p>
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mt-4 bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100">
                            Clear Search
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex lg:flex-row gap-4 md:gap-6 lg:overflow-x-auto pb-4 custom-scrollbar">
                    
                    <div className={`${activeTab === 'PENDING' ? 'flex' : 'hidden'} lg:flex flex-col bg-slate-200/50 rounded-[2rem] lg:rounded-3xl border border-slate-200 overflow-hidden w-full lg:w-[350px] xl:w-[400px] shrink-0 h-full`}>
                        <div className="p-3 md:p-4 bg-slate-200 border-b border-slate-300 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 text-sm md:text-base">
                                <BellRing size={16} /> New Tickets
                            </h2>
                            <span className="bg-white text-slate-700 font-black px-2.5 py-0.5 rounded-full text-xs md:text-sm">{pendingOrders.length}</span>
                        </div>
                        <div className="p-3 md:p-4 overflow-y-auto flex-1 space-y-3 md:space-y-4 custom-scrollbar">
                            {pendingOrders.map((order, idx) => <OrderTicket key={order.order_id} order={order} isFirst={idx === 0} />)}
                        </div>
                    </div>

                    <div className={`${activeTab === 'PREPARING' ? 'flex' : 'hidden'} lg:flex flex-col bg-indigo-50/50 rounded-[2rem] lg:rounded-3xl border border-indigo-100 overflow-hidden w-full lg:w-[350px] xl:w-[400px] shrink-0 h-full`}>
                        <div className="p-3 md:p-4 bg-indigo-100 border-b border-indigo-200 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-indigo-800 uppercase tracking-wider flex items-center gap-2 text-sm md:text-base">
                                <Flame size={16} /> Cooking
                            </h2>
                            <span className="bg-white text-indigo-700 font-black px-2.5 py-0.5 rounded-full text-xs md:text-sm shadow-sm">{preparingOrders.length}</span>
                        </div>
                        <div className="p-3 md:p-4 overflow-y-auto flex-1 space-y-3 md:space-y-4 custom-scrollbar">
                            {preparingOrders.map(order => <OrderTicket key={order.order_id} order={order} />)}
                        </div>
                    </div>

                    <div className={`${activeTab === 'READY' ? 'flex' : 'hidden'} lg:flex flex-col bg-emerald-50/50 rounded-[2rem] lg:rounded-3xl border border-emerald-100 overflow-hidden w-full lg:w-[350px] xl:w-[400px] shrink-0 h-full`}>
                        <div className="p-3 md:p-4 bg-emerald-100 border-b border-emerald-200 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2 text-sm md:text-base">
                                <ArrowRight size={16} /> Awaiting Pickup
                            </h2>
                            <span className="bg-white text-emerald-700 font-black px-2.5 py-0.5 rounded-full text-xs md:text-sm shadow-sm">{readyOrders.length}</span>
                        </div>
                        <div className="p-3 md:p-4 overflow-y-auto flex-1 space-y-3 md:space-y-4 custom-scrollbar">
                            {readyOrders.map(order => <OrderTicket key={order.order_id} order={order} />)}
                        </div>
                    </div>

                    <div className={`${activeTab === 'COMPLETED' ? 'flex' : 'hidden'} lg:flex flex-col bg-slate-100 rounded-[2rem] lg:rounded-3xl border border-slate-200 overflow-hidden w-full lg:w-[350px] xl:w-[400px] shrink-0 h-full opacity-80 hover:opacity-100 transition-opacity`}>
                        <div className="p-3 md:p-4 bg-slate-200 border-b border-slate-300 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-slate-600 uppercase tracking-wider flex items-center gap-2 text-sm md:text-base">
                                <History size={16} /> Recall (14hr)
                            </h2>
                            <span className="bg-white text-slate-600 font-black px-2.5 py-0.5 rounded-full text-xs md:text-sm shadow-sm">{recallOrders.length}</span>
                        </div>
                        <div className="p-3 md:p-4 overflow-y-auto flex-1 space-y-3 md:space-y-4 custom-scrollbar">
                            {recallOrders.length === 0 ? (
                                <p className="text-center text-slate-400 font-bold mt-10">No recent tickets.</p>
                            ) : (
                                recallOrders.map(order => <OrderTicket key={order.order_id} order={order} isRecall={true} />)
                            )}
                        </div>
                    </div>

                </div>
            )}

            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCancelModal({ isOpen: false, orderId: null })}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl p-5 md:p-6 border-t-8 border-red-500 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2 md:gap-3 text-red-600 mb-3 md:mb-4">
                            <AlertTriangle className="w-6 h-6 md:w-7 md:h-7" />
                            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Cancel Order?</h2>
                        </div>
                        <p className="text-slate-500 font-medium text-sm md:text-base mb-5 md:mb-6">
                            This action permanently removes the ticket from the active kitchen flow. If paid via M-Pesa, you must issue a manual refund.
                        </p>

                        <div className="space-y-1.5 md:space-y-2 mb-5 md:mb-6">
                            <label className="text-xs md:text-sm font-bold text-slate-700">Cancellation Reason</label>
                            <select 
                                value={cancelReason} 
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 md:p-3 text-sm md:text-base font-medium text-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                            >
                                <option value="" disabled>Select reason...</option>
                                <option value="Customer Walked Out">Customer Walked Out</option>
                                <option value="Item Out of Stock">Item Out of Stock</option>
                                <option value="Payment Failed">Payment Failed</option>
                                <option value="Staff Error">Staff Error / Duplicate</option>
                            </select>
                        </div>

                        <div className="flex gap-2 md:gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, orderId: null })} className="flex-1 py-2.5 md:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm md:text-base font-bold rounded-xl transition-colors">Keep Order</button>
                            <button onClick={() => cancelOrderMutation.mutate()} disabled={!cancelReason || cancelOrderMutation.isPending} className="flex-1 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm md:text-base font-bold rounded-xl transition-colors shadow-lg shadow-red-200">
                                {cancelOrderMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}