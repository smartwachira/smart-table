import { useState, useEffect, useCallback} from 'react';
import { useNavigate} from 'react-router-dom';
import axios from 'axios';
import {toast} from 'sonner';
import io from 'socket.io-client';
import {ChefHat, CheckCircle2,Ban,AlertTriangle,Clock,User,BellRing} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

//Sound Effect URL
const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// Mock Data for UI testing before backend is fully populated
const mockOrders = [
    { order_id: '1', table_number: 'T-12', status: 'PENDING', created_at: new Date(Date.now() - 5 * 60000).toISOString(), OrderItems: [{ quantity: 2, name: 'Tusker Lager' }, { quantity: 1, name: 'Nyama Choma', description: 'Well done, extra kachumbari' }] },
    { order_id: '2', table_number: 'VIP-1', status: 'PREPARING', created_at: new Date(Date.now() - 15 * 60000).toISOString(), OrderItems: [{ quantity: 1, name: 'Glenfiddich 18yr Bottle' }] }
];

export default function LiveOrders() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setIsLoading] = useState(true);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId:null});
    const [cancelReason, setCancelReason] = useState('');


    const userRole = user.role;

    //Play sound function
    const playSound = useCallback(()=>{
        try{
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e=> console.log("Audio play blocked by browser:",e));

        } catch (err){
            console.error("Audio play failed",err);
        }
    },[]);

    //The "Fetcher"
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


    //Function: Update order status
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

    //Helper to calculate elapsed time
    const getElapsedTime = (timestamp) =>{
        const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
        return diff > 60 ? '>1hr' : `${diff}m`;
    };

    const statusColors = {
        PENDING: 'bg-amber-50 border-amber-200 text-amber-800',
        PREPARING: 'bg-blue-50 border-blue-200 text-blue-800',
        READY: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    };

    useEffect(()=>{
            fetchOrders();

            const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

            socket.emit('join_venue',user.venueId);

            //Listen for new Orders
            socket.on('receive_order',()=>{
                // ARCHITECT'S TRICK: Instead of manually stitching the data together and risking 
                // missing food names, we just tell the component to fetch the fresh, perfect data 
                // directly from the database whenever the socket pings us!
                fetchOrders();

                toast.success(`New Order Arrived!`,{
                    icon: '🔔',
                    duration: 5000,
                    style: { background: '#fff',color: '#16a34a',fontWeight: 'bold'}
                },{ id: 'kitchen' });
                playSound();
            });

            //Listen to status update
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
            <div className="max-w-7xl mx-auto space-y-6">
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
                    {orders.length === 0?(
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                            <BellRing className="w-12 h-12 text-gray-300 mb-3"></BellRing>
                            <p className="text-lg font-medium text-gray-400">Waiting for customers...</p>
                        </div>
                    ) : (
                        orders.map((order)=>(
                            <div key={order.order_id} className={`flex flex-col bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${statusColors[order.status]}`}>

                                {/* Card Header */}
                                <div className={`p-4 border-b border-inherit bg-white/50 backdrop-blur-sm flex justify-between items-start`}>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Table / Tab</span>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{order.table_number || 'Takeaway'}</h3>
                                        <div className="flex items-center gap-1 text-sm font-medium opacity-80">
                                            <User size={14}></User> {order.customer_name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Time</span>
                                        <div className="flex items-center justify-end gap-1 text-sm font-bold opacity-90 mb-1">
                                            <Clock size={14}></Clock>
                                            {getElapsedTime(order.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                {/* PAYMENT STATUS BADGE */}
                                {order.payment_method === 'CASH' && order.payment_status === 'PENDING' ? (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
                                        Collect Cash: {order.total_amount.toLocaleString('en-KE')}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                                        Paid ({order.payment_method})
                                    </span>
                                )}
                                <div>

                                </div>
                                {/* Ticket Items */}
                                <div className="p-4 flex-1 bg-white/30 space-y-3">
                                
                                    {order.OrderItems?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-sm font-medium">
                                            <div className="flex gap-2">
                                                <span className="font-bold border-b-2 border-inherit px-1">{item.quantity}x</span>
                                                <span>
                                                    {item.MenuItem?.name || 'Unknown Item'}
                                                    {item.MenuItem?.description && <p className="text-xs font-normal opacity-75 mt-0.5 ml-1">↳ {item.MenuItem?.description}</p>}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Card Footer (Actions) */}
                                <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                                    {order.status === "PENDING" && (
                                        <button 
                                            className="flex-1 flex items-center justify-center gap-2 bg-[#52B520] hover:bg-[#459e1a] text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-[#52B520]/20"
                                            onClick={()=> updateStatus(order.order_id, 'PREPARING')}
                                        >
                                            <ChefHat size={18}></ChefHat> Fire Order
                                        </button>
                                    )}
                                    {order.status === "PREPARING" && (
                                        <button 
                                            className="flex-1 flex items-center justify-center gap-2 bg-[#52B520] hover:bg-[#459e1a] text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-[#52B520]/20"
                                            onClick={()=> updateStatus(order.order_id, 'PREPARING')}
                                        >
                                            <CheckCircle2 size={18}/> Mark Ready
                                        </button>
                                    )}
                                    {['MANAGER','OWNER'].includes(userRole) && (
                                        <button 
                                            className="flex items-center justify-center p-3 text-red-500 hover:bg-red-50 border-red-100 rounded-xl transition-all"
                                            title='Cancel Order'
                                            onClick={()=>setCancelModal({ isOpen: true, orderId: order.order_id})}
                                        >
                                            <Ban size={18}/>
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
                                <AlertTriangle size={28}></AlertTriangle>
                                <h2 className="text-xl font-bold text-slate-900">Cancel Order?</h2>
                            </div>
                            <p className="text-slate-600 mb-6">
                                This action will permanently cancel the order. If the customer has already paid via M-Pesa, you will need to process a manual refund.
                            </p>

                            <div className="space-y-2 mb-6">
                                <label htmlFor="" className="text-sm font-bold text-slate-700">Reason for cancellation (Required)</label>
                                <select 
                                    value={cancelReason} 
                                    onChange={(e)=> setCancelReason(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                >
                                    <option value="" disabled>Select a reason...</option>
                                    <option value="Customer Walked Out">Customer Walked Out</option>
                                    <option value="">Item Out of Stock</option>
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
        )  
};

