import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
    ArrowLeft, Clock, ChefHat, 
    BellRing, CheckCircle2, Receipt
} from 'lucide-react';

// Connect to your backend socket server
// In production, replace this with your actual deployed backend URL
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

export default function OrderStatus() {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue');
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Initial Order Data
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Notice we are fetching the full order details here to show the receipt
                const res = await axios.get(`/api/orders/${orderId}/status`);
                setOrder(res.data);
            } catch (err) {
                console.error("Failed to fetch order:", err);
                setError("We couldn't find this order. It may have been completed or cancelled.");
            } finally {
                setIsLoading(false);
            }
        };

        if (orderId) fetchOrder();
    }, [orderId]);

    // Set up Real-Time Socket Listeners
    useEffect(() => {
        if (!venueId || !orderId) return;

        // 1. Join the specific venue's room to listen for updates
        socket.emit('join_venue', venueId);

        // 2. Listen for 'orderUpdated' events emitted by the kitchen or M-Pesa webhook
        const handleOrderUpdate = (data) => {
            if (data.orderId === orderId && data.status) {
                setOrder(prev => ({ ...prev, status: data.status }));
            }
        };

        socket.on('orderUpdated', handleOrderUpdate);

        // Cleanup listener when the user leaves the page
        return () => {
            socket.off('orderUpdated', handleOrderUpdate);
        };
    }, [venueId, orderId]);


    if (isLoading) {
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
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold">
                    Go Back
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

    // Calculate current progress index
    const currentStepIndex = steps.findIndex(s => s.id === order.status);
    // If status is somehow not in the array (like CANCELLED), default to 0 to avoid breaking UI
    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0; 

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            
            {/* Header */}
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <button 
                    onClick={() => navigate(`/menu/${venueId}?table=${order.table_number}`)}
                    className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600"
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