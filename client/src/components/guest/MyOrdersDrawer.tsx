import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
    X, Receipt, ChefHat, BellRing, CheckCircle2, Clock, AlertCircle, CreditCard, Loader2 
} from 'lucide-react';
import { useGuestSessionStore } from '../../store/useGuestSessionStore';
import { useGuestOrders } from '../../hooks/useGuestOrders';

// ⚡ SPRINT 23: IMPORT THE UNIVERSAL ENGINE
import SmartPaymentEngine from '../shared/SmartPaymentEngine';

interface MyOrdersDrawerProps {
    isOpen: boolean;
    onOpen: () => void; 
    onClose: () => void;
    venueId: string | null;
}

const statusConfig: Record<string, any> = {
    PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Received' },
    PREPARING: { icon: ChefHat, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cooking' },
    READY: { icon: BellRing, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Ready for Table' },
    COMPLETED: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Served' },
    CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' }
};

export default function MyOrdersDrawer({ isOpen, onClose, venueId }: MyOrdersDrawerProps) {
    const { guestSessionId } = useGuestSessionStore();
    
    // ⚡ Hook directly into the Server State
    const { data: orders = [], isLoading, isError } = useGuestOrders(guestSessionId, venueId);

    // ⚡ SPRINT 23: Universal Engine State
    const [isEngineOpen, setIsEngineOpen] = useState(false);
    const [engineOrderIds, setEngineOrderIds] = useState<string[]>([]);
    const [engineAmount, setEngineAmount] = useState<number>(0);

    // Filter for open tabs
    const openTabOrders = orders.filter(o => o.payment_method === 'TAB' && o.payment_status === 'PENDING');
    const tabTotal = openTabOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    // Filter for history
    const paidOrders = orders.filter(o => o.payment_status === 'PAID' || o.payment_method === 'CASH');

    const handleSettleTab = () => {
        if (openTabOrders.length === 0) return;
        const orderIds = openTabOrders.map(o => o.order_id);
        setEngineOrderIds(orderIds);
        setEngineAmount(tabTotal);
        setIsEngineOpen(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-md bg-slate-50 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Receipt size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">My Orders</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-4">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <p className="text-slate-500 font-medium tracking-wide text-sm">Syncing with kitchen...</p>
                        </div>
                    ) : isError ? (
                        <div className="text-center p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold">
                            Failed to sync orders. Please refresh the page.
                        </div>
                    ) : (
                        <>
                            {openTabOrders.length > 0 && (
                                <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm relative overflow-hidden ring-1 ring-purple-500/10">
                                    <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-4">Current Tab</h3>
                                    
                                    <div className="space-y-4 mb-6">
                                        {openTabOrders.map((order) => (
                                            <div key={order.order_id} className="pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                                <div className="flex justify-between text-xs text-slate-400 font-bold mb-2">
                                                    <span>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span className="font-mono">Order #{order.order_id.slice(-4)}</span>
                                                </div>
                                                {order.OrderItems?.map((item) => (
                                                    <div key={item.item_id || Math.random()} className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center gap-2 text-slate-700">
                                                            <span className="font-black text-slate-900">{item.quantity}x</span>
                                                            <span className="font-medium">{item.MenuItem?.name}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-900">{Number(item.price_at_time).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-purple-100/50 flex justify-between items-end mb-5">
                                        <span className="text-sm font-black text-slate-500 uppercase tracking-wider">Tab Total</span>
                                        <span className="text-2xl font-black text-purple-700">KSh {tabTotal.toLocaleString()}</span>
                                    </div>

                                    <button 
                                        onClick={handleSettleTab}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                                    >
                                        <CreditCard size={20} /> Settle Tab Digitally
                                    </button>
                                </div>
                            )}

                            {paidOrders.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">Order History</h3>
                                    {paidOrders.map(order => {
                                        const StatusIcon = statusConfig[order.status]?.icon || Clock;
                                        return (
                                            <div key={order.order_id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                                                <div className="flex justify-between items-center">
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.color}`}>
                                                        <StatusIcon size={14} /> {statusConfig[order.status]?.label}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {order.OrderItems?.map(item => (
                                                        <div key={item.item_id || Math.random()} className="flex justify-between text-sm">
                                                            <span className="text-slate-700 font-medium"><span className="font-black text-slate-900">{item.quantity}x</span> {item.MenuItem?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-1">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{order.payment_method} • {order.payment_status}</span>
                                                    <span className="font-black text-slate-900">{Number(order.total_amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {orders.length === 0 && (
                                <div className="text-center p-10 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                                    <Receipt size={48} className="text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-medium">You haven't placed any orders yet.</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* ⚡ SPRINT 23: UNIVERSAL PAYMENT ENGINE */}
            <SmartPaymentEngine 
                isOpen={isEngineOpen}
                onClose={() => setIsEngineOpen(false)}
                amount={engineAmount}
                orderIds={engineOrderIds}
                venueId={venueId || ''}
                onSuccessCallback={() => {
                    toast.success("Payment successful! Tab cleared.");
                }}
            />
        </div>
    );
}