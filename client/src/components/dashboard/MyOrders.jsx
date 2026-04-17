import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import { 
    CheckCircle2, Clock, Flame, ArrowRight, 
    Banknote, MonitorSmartphone 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function MyOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('READY'); 

    // ⚡ FIX: Use Refs to track state silently without triggering Infinite Loops
    const previousReadyRef = useRef([]);
    const isFirstLoadRef = useRef(true);

    const playSound = useCallback(() => {
        try {
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e => console.log("Audio play blocked:", e));
        } catch (err) {
            console.error("Audio play failed", err);
        }
    }, []);

    const fetchOrders = useCallback(async (signal) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await axios.get('/api/orders/live', {
                headers: { Authorization: `Bearer ${token}` },
                signal
            });

            const myId = user?.userId || user?.id; 
            
            const myOrdersOnly = (response.data || []).filter(o => String(o.staff_id) === String(myId));

            const currentReadyIds = myOrdersOnly.filter(o => o.status === 'READY').map(o => o.order_id);
            
            // Only trigger notifications if it is NOT the first time the page is loading
            if (!isFirstLoadRef.current) {
                const hasNewReady = currentReadyIds.some(id => !previousReadyRef.current.includes(id));
                if (hasNewReady) {
                    playSound();
                    toast.success('An order is Ready for Pickup!', { icon: '🛎️' });
                }
            }

            // Update refs silently
            previousReadyRef.current = currentReadyIds;
            isFirstLoadRef.current = false;

            setOrders(myOrdersOnly);
        } catch (error) {
            // ⚡ FIX: Silently catch intentional race-condition cancellations
            if (axios.isCancel(error)) {
                return; 
            }
            toast.error("Could not load your orders");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, playSound]); // ⚡ FIX: 'orders' and 'isLoading' are completely removed from dependencies!

    useEffect(() => {
        const controller = new AbortController();
        fetchOrders(controller.signal);

        const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
        if (user?.venueId) socket.emit('join_venue', user.venueId);

        socket.on('receive_order', () => fetchOrders(controller.signal));
        socket.on('orderUpdated', () => fetchOrders(controller.signal));

        return () => {
            controller.abort();
            socket.disconnect();
        };
    }, [fetchOrders, user?.venueId]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('auth_token');
            setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));

            await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Order marked as ${newStatus}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update ticket.");
            fetchOrders(); 
        }
    };

    const handleCollectCash = async (orderId) => {
        if (!window.confirm("Confirm you have received the cash for this order?")) return;
        try {
            const token = localStorage.getItem('auth_token');
            setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, payment_status: 'PAID' } : o));
            
            await axios.patch(`/api/orders/${orderId}/collect-cash`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Cash logged securely.");
        } catch (error) {
            toast.error("Failed to log cash.");
            fetchOrders();
        }
    };

    const readyOrders = orders.filter(o => o.status === 'READY');
    const cookingOrders = orders.filter(o => ['PENDING', 'PREPARING'].includes(o.status));
    const completedOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

    if (isLoading) {
        return (
            <div className="flex h-[calc(100dvh-80px)] items-center justify-center bg-slate-50 text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <MonitorSmartphone size={48} className="mb-4 text-indigo-300" />
                    <p className="font-bold">Loading Your Tickets...</p>
                </div>
            </div>
        );
    }

    const OrderCard = ({ order }) => {
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
                            onClick={() => handleCollectCash(order.order_id)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <Banknote size={16}/> Collect {Number(order.total_amount).toLocaleString()} KES
                        </button>
                    )}
                    
                    {order.status === 'READY' && (
                        <button 
                            disabled={isCashPending}
                            onClick={() => updateStatus(order.order_id, 'COMPLETED')}
                            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                isCashPending 
                                ? 'bg-slate-200 text-slate-400' 
                                : 'bg-emerald-500 text-white active:scale-95 shadow-md shadow-emerald-200'
                            }`}
                        >
                            <CheckCircle2 size={16}/> Mark as Delivered
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