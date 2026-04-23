import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode'; 
import { 
    ArrowLeft, Clock, ChefHat, 
    BellRing, CheckCircle2, Receipt
} from 'lucide-react';

// 🛡️ Connect to your backend socket server with an explicit type
const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

// 🛡️ Interfaces for strict typing
interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp: number;
}

export type OrderStatusType = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface OrderData {
    order_id: string;
    status: OrderStatusType;
    [key: string]: any; // Allow other fields from DB without throwing errors
}

interface SocketUpdatePayload {
    orderId: string;
    status: OrderStatusType;
}

export default function OrderStatus() {
    // 🛡️ Type the URL param
    const { orderId } = useParams<{ orderId: string }>(); 
    const navigate = useNavigate();

    // 🛡️ State Typing
    const [venueId, setVenueId] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // ⚡ Extract Data from Token on Mount
    useEffect(() => {
        const token = localStorage.getItem('guest_token');
        if (token) {
            try {
                const decoded = jwtDecode<GuestJwtPayload>(token);
                if (decoded.role === 'GUEST') {
                    setVenueId(decoded.venueId);
                } else {
                    navigate('/scan', { replace: true });
                }
            } catch (error) {
                console.error("Token decoding failed", error);
                navigate('/scan', { replace: true });
            }
        } else {
            navigate('/scan', { replace: true });
        }
    }, [navigate]);

    // Fetch Initial Order Data
    useEffect(() => {
        const fetchOrder = async () => {
            if (!venueId || !orderId) return; 

            try {
                const res = await axios.get<OrderData>(`/api/orders/${orderId}/status`);
                setOrder(res.data);
            } catch (err) {
                console.error("Failed to fetch order:", err);
                setError("We couldn't find this order. It may have been completed or cancelled.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [orderId, venueId]);

    // Set up Real-Time Socket Listeners
    useEffect(() => {
        if (!venueId || !orderId) return;

        socket.emit('join_venue', venueId);

        // 🛡️ Strongly type the incoming socket data
        const handleOrderUpdate = (data: SocketUpdatePayload) => {
            if (data.orderId === orderId && data.status) {
                setOrder(prev => prev ? { ...prev, status: data.status } : null);
            }
        };

        socket.on('orderUpdated', handleOrderUpdate);

        return () => {
            socket.off('orderUpdated', handleOrderUpdate);
        };
    }, [venueId, orderId]);


    if (isLoading || !venueId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin text-indigo-600"><Clock size={32} /></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 size={48} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => navigate('/menu')} className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold transition-transform active:scale-95">
                    Return to Menu
                </button>
            </div>
        );
    }

    // Define the visual states for our progress tracker
    const steps = [
        { id: 'PENDING', label: 'Received', icon: Receipt },
        { id: 'PREPARING', label: 'Cooking', icon: ChefHat },
        { id: 'READY', label: 'Ready', icon: BellRing },
        { id: 'COMPLETED', label: 'Served', icon: CheckCircle2 }
    ];

    // Calculate current progress index safely
    const currentStepIndex = steps.findIndex(s => s.id === order.status);
    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0; 

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            
            {/* Header */}
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <button 
                    onClick={() => navigate(`/menu`)}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Order Status</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">#{order.order_id?.substring(0,8)}</p>
                </div>
                <div className="w-10 h-10" /> {/* Spacer for alignment */}
            </header>

            <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
                
                {/* Hero Status Display */}
                <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        {activeIndex === 0 && <Receipt size={36} />}
                        {activeIndex === 1 && <ChefHat size={36} className="animate-bounce" />}
                        {activeIndex === 2 && <BellRing size={36} className="animate-pulse text-amber-500" />}
                        {activeIndex === 3 && <CheckCircle2 size={36} className="text-emerald-500" />}
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 mb-2">
                        {activeIndex === 0 && "We got your order!"}
                        {activeIndex === 1 && "Chef is cooking..."}
                        {activeIndex === 2 && "Order is ready!"}
                        {activeIndex === 3 && "Enjoy your meal!"}
                    </h2>
                    
                    <p className="text-slate-500 font-medium text-sm px-4">
                        {activeIndex === 0 && "Your order has been sent to the kitchen."}
                        {activeIndex === 1 && "Your food is being prepared fresh."}
                        {activeIndex === 2 && "A waiter is bringing it to your table now."}
                        {activeIndex === 3 && "This order is complete. Need anything else?"}
                    </p>
                </div>

                {/* Vertical Progress Stepper */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <div className="relative pl-4 space-y-8">
                        {/* Connecting Line */}
                        <div className="absolute left-[2.1rem] top-6 bottom-6 w-0.5 bg-slate-100 rounded-full"></div>
                        
                        {steps.map((step, index) => {
                            const isCompleted = index < activeIndex;
                            const isActive = index === activeIndex;
                            
                            const Icon = step.icon;

                            return (
                                <div key={step.id} className="relative flex items-center gap-6 z-10">
                                    {/* Status Bubble */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                                        isCompleted ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                                        isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 ring-4 ring-indigo-50' :
                                        'bg-slate-100 text-slate-400 border-2 border-slate-200 border-dashed'
                                    }`}>
                                        <Icon size={20} />
                                    </div>
                                    
                                    {/* Text Label */}
                                    <div>
                                        <h4 className={`font-bold text-lg ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                            {step.label}
                                        </h4>
                                        {isActive && (
                                            <p className="text-xs text-indigo-400 font-semibold mt-0.5 animate-pulse">Right now</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>
        </div>
    );
}