import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import { 
    ChefHat, CheckCircle2, Ban, AlertTriangle, Clock, 
    User, BellRing, Flame, ArrowRight, UtensilsCrossed 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function LiveOrders() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [orders, setOrders] = useState([]);
    const [loading, setIsLoading] = useState(true);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null });
    const [cancelReason, setCancelReason] = useState('');
    
    // Refs for real-time diff checking and auto-scrolling
    const previousOrderIdsRef = useRef(new Set());
    const newOrderScrollRef = useRef(null);

    const userRole = user?.role || 'STAFF';

    // ⚡ Audio Ping for New Orders
    const playSound = useCallback(() => {
        try {
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e => console.log("Audio play blocked by browser:", e));
        } catch (err) {
            console.error("Audio play failed", err);
        }
    }, []);

    // ⚡ Smart Polling & Data Fetch
    const fetchOrders = useCallback(async (signal) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            const response = await axios.get('/api/orders/live', {
                headers: { Authorization: `Bearer ${token}` },
                signal
            });

            const fetchedOrders = response.data || [];
            
            // Diff-Checking Engine: Detect genuinely new orders
            const currentIds = new Set(fetchedOrders.map(o => o.order_id));
            let hasNewOrder = false;

            if (previousOrderIdsRef.current.size > 0) {
                currentIds.forEach(id => {
                    if (!previousOrderIdsRef.current.has(id)) {
                        hasNewOrder = true;
                    }
                });
            }

            if (hasNewOrder) {
                playSound();
                toast.success('New Order Arrived!', { icon: '🛎️' });
                // Smooth scroll to top/left to see the new ticket
                if (newOrderScrollRef.current) {
                    newOrderScrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            previousOrderIdsRef.current = currentIds;
            setOrders(fetchedOrders);

        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Error Loading orders:", error);
                toast.error("Could not load kitchen orders");
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate, playSound]);

    // ⚡ Setup Polling & Sockets
    useEffect(() => {
        const controller = new AbortController();
        fetchOrders(controller.signal);

        // Silent Polling every 10 seconds
        const interval = setInterval(() => fetchOrders(controller.signal), 10000);

        // Fallback WebSockets
        const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
        if (user?.venueId) socket.emit('join_venue', user.venueId);

        socket.on('receive_order', () => fetchOrders(controller.signal));
        socket.on('orderUpdated', () => fetchOrders(controller.signal));

        return () => {
            clearInterval(interval);
            controller.abort();
            socket.disconnect();
        };
    }, [fetchOrders, user?.venueId]);

    // ⚡ State Machine Action
    const updateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Optimistic UI Update (Makes the app feel instantly responsive)
            setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));

            await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Ticket advanced to ${newStatus}`);
        } catch (error) {
            toast.error("Failed to advance ticket.");
            // Revert optimistic update on failure by re-fetching
            fetchOrders(); 
        }
    };

    // ⚡ Cancel Action
    const handleCancel = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/orders/${cancelModal.orderId}/status`, 
                { status: 'CANCELLED', reason: cancelReason }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success("Order Cancelled");
            setCancelModal({ isOpen: false, orderId: null });
            setCancelReason('');
            fetchOrders();
        } catch (error) {
            toast.error("Failed to cancel order.");
        }
    };

    // ⚡ SLA Timer Logic
    const getElapsedMinutes = (timestamp) => {
        const created = new Date(timestamp);
        const now = new Date();
        return Math.floor((now - created) / 60000);
    };

    // Categorize Orders for Kanban Columns
    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const preparingOrders = orders.filter(o => o.status === 'PREPARING');
    const readyOrders = orders.filter(o => o.status === 'READY');

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <ChefHat className="animate-bounce text-indigo-600 w-16 h-16 mb-4" />
                <h2 className="text-xl font-bold text-slate-700 tracking-tight">Syncing Kitchen Display...</h2>
            </div>
        );
    }

    // --- SUB-COMPONENT: KANBAN TICKET ---
    const OrderTicket = ({ order, isFirst }) => {
        const elapsedMins = getElapsedMinutes(order.createdAt || order.created_at);
        
        // SLA Visual Urgency Logic
        let slaColor = 'bg-white border-slate-200';
        let headerColor = 'bg-slate-50 text-slate-700';
        let timeColor = 'text-slate-500';

        if (order.status !== 'READY') {
            if (elapsedMins >= 20) {
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
            <div ref={isFirst ? newOrderScrollRef : null} className={`flex flex-col rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${slaColor}`}>
                
                {/* Header */}
                <div className={`p-4 flex justify-between items-start ${headerColor}`}>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Table / Tab</span>
                        <h3 className="text-2xl font-black mb-1 leading-none">{order.table_number || 'Takeaway'}</h3>
                        <div className="flex items-center gap-1 text-xs font-bold opacity-90">
                            <User size={12} /> {order.customer_name || 'Guest'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`flex items-center justify-end gap-1 text-sm ${timeColor}`}>
                            <Clock size={14} />
                            {elapsedMins > 60 ? '>1hr' : `${elapsedMins}m`}
                        </div>
                        {order.payment_method === 'CASH' && order.payment_status === 'PENDING' && (
                            <span className="mt-2 inline-block px-2 py-0.5 bg-black/10 text-inherit rounded text-[10px] font-black uppercase tracking-wider">
                                Collect Cash
                            </span>
                        )}
                    </div>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3">
                    {order.OrderItems?.map((item, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                            <span className="font-black text-lg text-slate-400 leading-none">{item.quantity}x</span>
                            <div>
                                <span className="font-bold text-slate-800 text-base">{item.MenuItem?.name || item.name}</span>
                                {(item.notes || item.MenuItem?.description) && (
                                    <p className="text-xs font-bold text-red-600 mt-0.5 pl-2 border-l-2 border-red-200">
                                        Note: {item.notes || item.MenuItem?.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Actions */}
                <div className="p-3 bg-white/50 border-t border-slate-100 flex gap-2">
                    {order.status === "PENDING" && (
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm"
                            onClick={() => updateStatus(order.order_id, 'PREPARING')}
                        >
                            <Flame size={18} /> Start Cooking
                        </button>
                    )}
                    {order.status === "PREPARING" && (
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm"
                            onClick={() => updateStatus(order.order_id, 'READY')}
                        >
                            <CheckCircle2 size={18}/> Mark Ready
                        </button>
                    )}
                    {order.status === "READY" && (
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm"
                            onClick={() => updateStatus(order.order_id, 'COMPLETED')}
                        >
                            <UtensilsCrossed size={18}/> Complete / Served
                        </button>
                    )}
                    
                    {['MANAGER','OWNER'].includes(userRole) && (
                        <button 
                            className="flex items-center justify-center p-3 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                            title='Cancel Order'
                            onClick={() => setCancelModal({ isOpen: true, orderId: order.order_id })}
                        >
                            <Ban size={20}/>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 h-screen flex flex-col bg-slate-100">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        Kitchen Display System 
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">First-In, First-Out (FIFO) Ticket Management</p>
                </div>
                <div className="hidden md:flex gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 rounded-full bg-slate-200"></div> Standard</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600"><div className="w-3 h-3 rounded-full bg-amber-400"></div> &gt; 10 mins</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-red-600"><div className="w-3 h-3 rounded-full bg-red-500"></div> &gt; 20 mins</div>
                </div>
            </div>

            {/* ⚡ KANBAN BOARD LAYOUT */}
            {orders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                        <BellRing size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">The Kitchen is Clear</h2>
                    <p className="text-slate-500 font-medium">Waiting for new orders to arrive...</p>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    
                    {/* Column 1: PENDING */}
                    <div className="flex flex-col bg-slate-200/50 rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-200 border-b border-slate-300 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <BellRing size={16} /> New Tickets
                            </h2>
                            <span className="bg-white text-slate-700 font-black px-2.5 py-0.5 rounded-full text-sm">{pendingOrders.length}</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                            {pendingOrders.map((order, idx) => <OrderTicket key={order.order_id} order={order} isFirst={idx === 0} />)}
                        </div>
                    </div>

                    {/* Column 2: PREPARING */}
                    <div className="flex flex-col bg-indigo-50/50 rounded-3xl border border-indigo-100 overflow-hidden">
                        <div className="p-4 bg-indigo-100 border-b border-indigo-200 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-indigo-800 uppercase tracking-wider flex items-center gap-2">
                                <Flame size={16} /> Cooking
                            </h2>
                            <span className="bg-white text-indigo-700 font-black px-2.5 py-0.5 rounded-full text-sm shadow-sm">{preparingOrders.length}</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                            {preparingOrders.map(order => <OrderTicket key={order.order_id} order={order} />)}
                        </div>
                    </div>

                    {/* Column 3: READY */}
                    <div className="flex flex-col bg-emerald-50/50 rounded-3xl border border-emerald-100 overflow-hidden">
                        <div className="p-4 bg-emerald-100 border-b border-emerald-200 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                                <ArrowRight size={16} /> Awaiting Pickup
                            </h2>
                            <span className="bg-white text-emerald-700 font-black px-2.5 py-0.5 rounded-full text-sm shadow-sm">{readyOrders.length}</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                            {readyOrders.map(order => <OrderTicket key={order.order_id} order={order} />)}
                        </div>
                    </div>

                </div>
            )}

            {/* Cancellation Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCancelModal({ isOpen: false, orderId: null })}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl p-6 border-t-8 border-red-500 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle size={28} />
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Cancel Order?</h2>
                        </div>
                        <p className="text-slate-500 font-medium mb-6">
                            This action permanently removes the ticket from the kitchen. If paid via M-Pesa, you must issue a manual refund.
                        </p>

                        <div className="space-y-2 mb-6">
                            <label className="text-sm font-bold text-slate-700">Cancellation Reason</label>
                            <select 
                                value={cancelReason} 
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                            >
                                <option value="" disabled>Select reason...</option>
                                <option value="Customer Walked Out">Customer Walked Out</option>
                                <option value="Item Out of Stock">Item Out of Stock</option>
                                <option value="Payment Failed">Payment Failed</option>
                                <option value="Staff Error">Staff Error / Duplicate</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, orderId: null })} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Keep Order</button>
                            <button onClick={handleCancel} disabled={!cancelReason} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200">Confirm Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}