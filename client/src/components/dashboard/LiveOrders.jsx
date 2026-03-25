import { useState, useEffect, useCallback} from 'react';
import { useNavigate} from 'react-router-dom';
import axios from 'axios';
import {toast} from 'sonner';
import io from 'socket.io-client';
import {ChefHat, CheckCircle2,Ban,AlertTriangle,Clock,User,BellRing} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const mockOrders = [
    { order_id: '1', table_number: 'T-12', customer_name: 'Guest', status: 'PENDING', created_at: new Date(Date.now() - 5 * 60000).toISOString(), total_amount: 1500, OrderItems: [{ quantity: 2, name: 'Tusker Lager' }, { quantity: 1, name: 'Nyama Choma', description: 'Well done, extra kachumbari' }] },
    { order_id: '2', table_number: 'VIP-1', customer_name: 'Guest', status: 'PREPARING', created_at: new Date(Date.now() - 15 * 60000).toISOString(), total_amount: 8500, OrderItems: [{ quantity: 1, name: 'Glenfiddich 18yr Bottle' }] }
];

export default function LiveOrders() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setIsLoading] = useState(true);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId:null});
    const [cancelReason, setCancelReason] = useState('');

    const userRole = user.role;

    const playSound = useCallback(()=>{
        try{
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e=> console.log("Audio play blocked by browser:",e));
        } catch (err){
            console.error("Audio play failed",err);
        }
    },[]);

    const fetchOrders = useCallback(async ()=>{
        try{
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            const response = await axios.get('/api/orders/live',{
                headers: {Authorization: `Bearer ${token}`},
                venueId: user.venueId
            });
            setOrders(response.data.length > 0 ? response.data : mockOrders);
        } catch (error){
            console.error("Error Loading orders:", error);
            toast.error("Could not load orders",{ id: 'kitchen' });
        } finally {
            setIsLoading(false)
        }
    },[navigate,user.venueId]);

    const updateStatus = async (orderId, newStatus) =>{
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await axios.patch(`/api/orders/${orderId}/status`,
                {
                    status: newStatus,
                    orderId,
                    cancelReason: newStatus === 'CANCELLED' ? cancelReason: null
                },
                {headers: {Authorization: `Bearer ${token}`}}
            );

            toast.success(`Order #${orderId.slice(0,4)} updated to ${newStatus}`);
            setOrders(prev=>prev.map(o=>
                o.order_id === orderId ? {...o,status:newStatus} : o
            ));
            setCancelModal({ isOpen: false, orderId: null});
            setCancelReason('');
            fetchOrders();
        } catch (error){
            toast.error(error.response?.data?.message || "Failed to update status",{ id: 'kitchen' });
            console.error("Error updating status", error);
        }
    };

    const getElapsedTime = (timestamp) =>{
        const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
        return diff > 60 ? '>1hr' : `${diff}m`;
    };

    const statusColors = {
        PENDING: 'bg-amber-50 border-amber-200 text-amber-800',
        PREPARING: 'bg-indigo-50 border-indigo-200 text-indigo-800', // Changed to indigo for contrast
        READY: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    };

    useEffect(()=>{
            fetchOrders();
            const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
            socket.emit('join_venue',user.venueId);

            socket.on('receive_order',()=>{
                fetchOrders();
                toast.success(`New Order Arrived!`,{
                    icon: '🔔',
                    duration: 5000,
                    style: { background: '#fff',color: '#16a34a',fontWeight: 'bold'}
                },{ id: 'kitchen' });
                playSound();
            });

            socket.on('orderUpdated', (data)=>{
                fetchOrders();
                toast(`Order #${data.orderId.slice(0,4)} updated`, { position: 'bottom-center' })
            })

            return ()=>socket.disconnect();
    },[fetchOrders,playSound,user.venueId]);

    if (loading){
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ChefHat className="animate-bounce text-brand-primary w-16 h-16 mb-4"></ChefHat>
                <h2 className="text-xl font-bold text-gray-700">Loading LiveOrders...</h2>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Live Expeditor Board 
                        <span className="flex h-3 w-3 relative ml-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Real-time tracking and Management.</p>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <BellRing className="w-12 h-12 text-gray-300 mb-3"></BellRing>
                        <p className="text-lg font-medium text-gray-400">Waiting for customers...</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.order_id} className={`flex flex-col bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${statusColors[order.status]}`}>

                            {/* Card Header */}
                            <div className={`p-4 border-b border-inherit bg-white/50 backdrop-blur-sm flex justify-between items-start`}>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Table / Tab</span>
                                    <h3 className="text-xl font-black text-gray-900 mb-1">{order.table_number || 'Takeaway'}</h3>
                                    <div className="flex items-center gap-1 text-sm font-bold opacity-80 text-slate-700">
                                        <User size={14} /> {order.customer_name || 'Guest'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Time</span>
                                    <div className="flex items-center justify-end gap-1 text-sm font-bold opacity-90 mb-1">
                                        <Clock size={14} />
                                        {/* ⚡ Fixed Date Pathing */}
                                        {getElapsedTime(order.created_at || order.createdAt || new Date())}
                                    </div>
                                </div>
                            </div>

                            {/* PAYMENT STATUS BADGE */}
                            <div className="px-4 pt-4 pb-2 bg-white/30">
                                {order.payment_method === 'CASH' && order.payment_status === 'PENDING' ? (
                                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
                                        {/* ⚡ Added Safe Number Parsing */}
                                        Collect Cash: {order.total_amount ? Number(order.total_amount).toLocaleString('en-KE') : '...'}
                                    </span>
                                ) : (
                                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                                        Paid ({order.payment_method || 'M-PESA'})
                                    </span>
                                )}
                            </div>

                            {/* Ticket Items */}
                            <div className="p-4 pt-2 flex-1 bg-white/30 space-y-3">
                                {order.OrderItems?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm">
                                        <div className="flex gap-2">
                                            <span className="font-black border-b-2 border-inherit px-1 h-fit text-slate-700">{item.quantity}x</span>
                                            <span>
                                                {/* ⚡ Fixed Item Pathing to prioritize order_item name */}
                                                <span className="font-bold text-slate-800">{item.name || item.MenuItem?.name || 'Unknown Item'}</span>
                                                {(item.description || item.MenuItem?.description) && (
                                                    <p className="text-xs font-medium text-slate-500 mt-1 pl-1 border-l-2 border-slate-300">
                                                        {item.description || item.MenuItem?.description}
                                                    </p>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Card Footer (Actions) */}
                            <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex gap-2 backdrop-blur-sm">
                                {order.status === "PENDING" && (
                                    <button 
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#52B520] hover:bg-[#459e1a] text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-[#52B520]/20"
                                        onClick={()=> updateStatus(order.order_id, 'PREPARING')}
                                    >
                                        <ChefHat size={18} /> Fire Order
                                    </button>
                                )}
                                {order.status === "PREPARING" && (
                                    <button 
                                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-indigo-600/20"
                                        // ⚡ FIXED BUG: This now correctly updates the status to READY
                                        onClick={()=> updateStatus(order.order_id, 'READY')}
                                    >
                                        <CheckCircle2 size={18}/> Mark Ready
                                    </button>
                                )}
                                {['MANAGER','OWNER'].includes(userRole) && (
                                    <button 
                                        className="flex items-center justify-center p-3 text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 rounded-xl transition-all"
                                        title='Cancel Order'
                                        onClick={()=>setCancelModal({ isOpen: true, orderId: order.order_id})}
                                    >
                                        <Ban size={20}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Cancellation Confirmation Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={()=>setCancelModal({ isOpen:false,orderId:null})}></div>
                    <div className="relative bg-white w-full max-w-md rounded-2xl p-6 border-t-4 border-red-500 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle size={28} />
                            <h2 className="text-xl font-bold text-slate-900">Cancel Order?</h2>
                        </div>
                        <p className="text-slate-600 mb-6">
                            This action will permanently cancel the order. If the customer has already paid via M-Pesa, you will need to process a manual refund.
                        </p>

                        <div className="space-y-2 mb-6">
                            <label className="text-sm font-bold text-slate-700">Reason for cancellation (Required)</label>
                            <select 
                                value={cancelReason} 
                                onChange={(e)=> setCancelReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            >
                                <option value="" disabled>Select a reason...</option>
                                <option value="Customer Walked Out">Customer Walked Out</option>
                                {/* ⚡ Fixed missing value string here */}
                                <option value="Item Out of Stock">Item Out of Stock</option> 
                                <option value="Payment Failed">Payment Failed</option>
                                <option value="Staff Error">Staff Error / Duplicate</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={()=> setCancelModal({ isOpen: false, orderId: null})} 
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                            >Keep Order</button>
                            <button
                                onClick={()=> updateStatus(cancelModal.orderId, 'CANCELLED')} 
                                disabled={!cancelReason}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-md shadow-red-200"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}