import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode'; 
import { 
    ArrowLeft, Clock, ChefHat, 
    BellRing, CheckCircle2, Receipt
} from 'lucide-react';

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { useOrderStatus, SocketUpdatePayload } from '../../hooks/useOrderStatus';

// 🛡️ Interfaces
interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp: number;
}

export default function OrderStatus() {
    const { orderId } = useParams<{ orderId: string }>(); 
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [venueId, setVenueId] = useState<string | null>(null);

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

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hook
    // ============================================================================
    const { data: order, isLoading, error } = useOrderStatus(orderId, venueId);

    // ============================================================================
    // ⚡ WEBSOCKET INTEGRATION
    // ============================================================================
    useEffect(() => {
        if (!venueId || !orderId) return;

        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: { guest_token: localStorage.getItem('guest_token') }
        });
        
        // Ensure the guest receives updates specifically for this order
        socket.emit('join_order_room', orderId);

        // ⚡ Sniper rifle invalidation triggered by standardized events
        socket.on('order:status_updated', () => queryClient.invalidateQueries({ queryKey: ['orderStatus', orderId] }));
        socket.on('order:cancelled', () => queryClient.invalidateQueries({ queryKey: ['orderStatus', orderId] }));

        return () => {
            socket.disconnect();
        };
    }, [venueId, orderId, queryClient]);

    // UI Render Logic
    if (isLoading && !order) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin text-indigo-600"><Clock size={32} /></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <CheckCircle2 size={48} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Order Complete</h2>
                <p className="text-slate-500 mb-6">We couldn't find this order. It may have been completed or cancelled.</p>
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
        <div className="min-h-screen bg-slate-50 font-sans pb-12 animate-in fade-in duration-300">
            
            {/* Header */}
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
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
                <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-slate-100 relative overflow-hidden">
                    
                    {/* Background Pulse Effect for Active State */}
                    {activeIndex < 3 && (
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                    )}

                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                        {activeIndex === 0 && <Receipt size={36} />}
                        {activeIndex === 1 && <ChefHat size={36} className="animate-bounce" />}
                        {activeIndex === 2 && <BellRing size={36} className="animate-pulse text-amber-500" />}
                        {activeIndex === 3 && <CheckCircle2 size={36} className="text-emerald-500" />}
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 mb-2 relative z-10">
                        {activeIndex === 0 && "We got your order!"}
                        {activeIndex === 1 && "Chef is cooking..."}
                        {activeIndex === 2 && "Order is ready!"}
                        {activeIndex === 3 && "Enjoy your meal!"}
                    </h2>
                    
                    <p className="text-slate-500 font-medium text-sm px-4 relative z-10">
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
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                                        isCompleted ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                                        isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 ring-4 ring-indigo-50 scale-110' :
                                        'bg-slate-50 text-slate-400 border border-slate-200'
                                    }`}>
                                        <Icon size={20} />
                                    </div>
                                    
                                    {/* Text Label */}
                                    <div>
                                        <h4 className={`font-bold text-lg transition-colors duration-300 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
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