import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner'; // ⚡ Standardized to match the global App.tsx Toaster
import { io, Socket } from 'socket.io-client';
import { ChefHat, RefreshCw, LogOut, CheckCircle, Trash2, Clock, User, BellRing } from 'lucide-react';

// Sound Effect URL
const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// 🛡️ Strict typing for the deeply nested Order data
interface OrderItemData {
    order_item_id: string;
    quantity: number;
    MenuItem?: {
        name: string;
    };
}

export interface KitchenOrder {
    order_id: string;
    table_number: string;
    customer_name: string;
    status: string;
    createdAt: string;
    OrderItems: OrderItemData[];
}

const Kitchen: React.FC = () => {
    // 🛡️ Strongly type URL parameters
    const { venueId } = useParams<{ venueId: string }>();
    const navigate = useNavigate();
    
    // 🛡️ Strongly type the state arrays
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setIsLoading] = useState<boolean>(true);
    
    const userRole = localStorage.getItem("role");

    // Play sound function
    const playSound = useCallback(() => {
        try {
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e => console.log("Audio play blocked by browser:", e));
        } catch (err) {
            console.error("Audio play failed", err);
        }
    }, []);

    // The "Fetcher"
    const fetchOrders = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            // 🛡️ Type the axios response
            const response = await axios.get<KitchenOrder[]>(`/api/orders/${venueId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(response.data);

        } catch (error) {
            console.error("Error Loading orders:", error);
            toast.error("Could not load orders", { id: 'kitchen' });
        } finally {
            setIsLoading(false);
        }
    }, [venueId, navigate]);

    // Function: Update order status
    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await axios.patch(`/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Order Updated", { id: 'kitchen' });
            setOrders(prev => prev.map(o =>
                o.order_id === orderId ? { ...o, status: newStatus } : o
            ));
        } catch (error) {
            toast.error("Failed to update status", { id: 'kitchen' });
            console.error("Error updating status", error);
        }
    };

    // Delete Function
    const handleDelete = async (orderId: string) => {
        if (!window.confirm("Are you sure you want to VOID this order?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/orders/${orderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Order Voided 🗑️", { id: 'kitchen' });
            // Note: We don't manually filter here because the socket will broadcast 'delete_order' 
            // and remove it for everyone automatically!

        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error("Failed to delete: " + (axiosError.response?.data?.message || axiosError.message), { id: 'kitchen' });
        }
    };

    // Handle Logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem("role");
        localStorage.removeItem('venueId');
        navigate("/login");
    };

    // Determine Status Colors dynamically
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready': return 'bg-emerald-100 text-emerald-800  border-emerald-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Initial Load + Socket Connection
    useEffect(() => {
        fetchOrders();

        // 🛡️ Type the Socket client
        const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

        socket.emit('join_venue', venueId);

        // Listen for new Orders
        socket.on('receive_order', () => {
            // ARCHITECT'S TRICK: Instead of manually stitching the data together and risking 
            // missing food names, we just tell the component to fetch the fresh, perfect data 
            // directly from the database whenever the socket pings us!
            fetchOrders();

            toast.success(`New Order Arrived!`, {
                icon: '🔔',
                duration: 5000,
                style: { background: '#fff', color: '#16a34a', fontWeight: 'bold' },
                id: 'kitchen'
            });
            playSound();
        });

        // Listen for Deleted Orders
        socket.on("delete_order", (deletedOrderId: string) => {
            setOrders(prevOrders => prevOrders.filter(o => o.order_id !== deletedOrderId));
            toast('An order was voided', { icon: '🗑️', id: 'kitchen' });
        });

        return () => {
            socket.disconnect();
        };
    }, [venueId, fetchOrders, playSound]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ChefHat className="animate-bounce text-brand-primary w-16 h-16 mb-4"></ChefHat>
                <h2 className="text-xl font-bold text-gray-700">Loading Kitchen Display...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            {/* KDS Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="p-3 bg-brand-primary/10 rounded-xl">
                        <ChefHat className="text-brand-primary w-8 h-8"></ChefHat>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Kitchen Display</h1>
                        <p className="text-sm text-gray-500 font-medium">Live Order Stream</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-medium transition-all">
                        <RefreshCw></RefreshCw> Refresh
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-2 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-all">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <BellRing className="w-12 h-12 text-gray-300 mb-3"></BellRing>
                        <p className="text-lg font-medium text-gray-400">Waiting for customers...</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        // ⚡ SYNTAX BUG FIX: The dynamic class logic was broken in your original file. It is now corrected.
                        <div key={order.order_id} className={`flex flex-col bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${order.status.toLowerCase() === 'pending' ? 'border-amber-200' : 'border-gray-100'}`}>

                            {/* Card Header */}
                            <div className={`p-4 border-b flex justify-between items-start ${getStatusColor(order.status)}`}>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Table {order.table_number}</h3>
                                    <div className="flex items-center gap-1 text-sm font-medium opacity-80">
                                        <User size={14}></User> {order.customer_name}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-sm font-bold opacity-90 mb-1">
                                        <Clock size={14}></Clock>
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <span className="uppercase text-[10px] tracking-wider font-bold px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm shadow-sm">
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Card Body (Items) */}
                            <div className="p-4 flex-grow bg-white">
                                <ul className="space-y-3">
                                    {order.OrderItems.map((item) => (
                                        <li key={item.order_item_id} className="flex items-start gap-3 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-brand-primary font-bold text-sm shrink-0">
                                                {item.quantity}x
                                            </span>
                                            <span className="font-medium text-gray-800 pt-1 leading-snug">
                                                {item.MenuItem ? item.MenuItem.name : "Unknown Item"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Card Footer (Actions) */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                {order.status.toLowerCase() === "pending" && (
                                    <button 
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#52B520] hover:bg-[#459e1a] text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-[#52B520]/20"
                                        onClick={() => handleStatusChange(order.order_id, 'ready')}
                                    >
                                        <CheckCircle size={18}></CheckCircle> Mark Ready
                                    </button>
                                )}
                                {userRole === 'manager' && (
                                    <button 
                                        className="flex items-center justify-center p-3 text-red-500 hover:bg-red-50 border-red-100 rounded-xl transition-all"
                                        title='Void Order'
                                        onClick={() => handleDelete(order.order_id)}
                                    >
                                        <Trash2 size={18}></Trash2>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Kitchen;