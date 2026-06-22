import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
    X, Receipt, ChefHat, BellRing, CheckCircle2, Clock, AlertCircle, CreditCard, Loader2, Banknote, Lock
} from 'lucide-react';
import { useGuestSessionStore } from '../../store/useGuestSessionStore';
import { useGuestOrders, GuestOrder } from '../../hooks/useGuestOrders';
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
    READY: { icon: BellRing, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Ready' },
    COMPLETED: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Served' },
    CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' }
};

// ⚡ SPRINT 23: Themed, Universal, and Collapsible Kitchen Tracker
const MiniTracker = ({ status, theme = 'purple' }: { status: string, theme?: 'purple' | 'indigo' }) => {
    const steps = [
        { id: 'PENDING', icon: Receipt, label: 'Received' },
        { id: 'PREPARING', icon: ChefHat, label: 'Cooking' },
        { id: 'READY', icon: BellRing, label: 'Ready' },
        { id: 'COMPLETED', icon: CheckCircle2, label: 'Served' }
    ];
    const currentIndex = steps.findIndex(s => s.id === status);
    const activeIndex = currentIndex >= 0 ? currentIndex : 0;

    const themeColor = theme === 'purple' ? 'bg-purple-600 shadow-purple-600/20' : 'bg-indigo-600 shadow-indigo-600/20';
    const textColor = theme === 'purple' ? 'text-purple-700' : 'text-indigo-700';
    const lineColor = theme === 'purple' ? 'bg-purple-500' : 'bg-indigo-500';

    return (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100/50 relative">
            {/* Background Track */}
            <div className="absolute left-[12%] right-[12%] top-[26px] h-0.5 bg-slate-100 z-0"></div>
            {/* Active Progress Line */}
            <div className={`absolute left-[12%] top-[26px] h-0.5 ${lineColor} z-0 transition-all duration-500`} style={{ width: `${(activeIndex / 3) * 76}%` }}></div>
            
            {steps.map((step, idx) => {
                const isCompleted = idx <= activeIndex;
                const isActive = idx === activeIndex;
                const Icon = step.icon;
                return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5 w-1/4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted ? `${themeColor} text-white shadow-md` : 'bg-white text-slate-300 border border-slate-200'}`}>
                            <Icon size={12} className={isActive && idx < 3 ? 'animate-pulse' : ''} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? textColor : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default function MyOrdersDrawer({ isOpen, onOpen, onClose, venueId }: MyOrdersDrawerProps) {
    const { guestSessionId } = useGuestSessionStore();
    const { data: orders = [], isLoading, isError } = useGuestOrders(guestSessionId, venueId);

    const [isEngineOpen, setIsEngineOpen] = useState(false);
    const [engineOrderIds, setEngineOrderIds] = useState<string[]>([]);
    const [engineAmount, setEngineAmount] = useState<number>(0);

    const openTabOrders = orders.filter((o: GuestOrder) => o.payment_method === 'TAB' && o.payment_status === 'PENDING');
    const tabTotal = openTabOrders.reduce((sum: number, o: GuestOrder) => sum + Number(o.total_amount), 0);
    const paidOrders = orders.filter((o: GuestOrder) => o.payment_status === 'PAID' || o.payment_method === 'CASH');

    const handleSettleTab = () => {
        if (openTabOrders.length === 0) return;
        const orderIds = openTabOrders.map((o: GuestOrder) => o.order_id);
        setEngineOrderIds(orderIds);
        setEngineAmount(tabTotal);
        setIsEngineOpen(true);
    };

    if (!isOpen) {
        if (!orders || orders.length === 0) return null;
        const activeOrders = orders.filter((o: GuestOrder) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        if (activeOrders.length === 0) return null;

        const totalActiveItems = activeOrders.reduce((acc: number, order: GuestOrder) => acc + order.OrderItems.reduce((sum: number, item: any) => sum + item.quantity, 0), 0);
        return (
            <div className="fixed bottom-24 right-4 z-40 animate-in slide-in-from-bottom-5 fade-in duration-500">
                <button onClick={onOpen} className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center relative">
                        <Clock size={16} className="text-white animate-spin-slow" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                            {activeOrders.length}
                        </span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-black tracking-tight">{totalActiveItems} Items Cooking</span>
                        <span className="text-[10px] font-medium text-slate-300">Tap to track status</span>
                    </div>
                </button>
            </div>
        );
    }

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

                <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-24">
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
                                    <div className="flex items-center gap-2 mb-4">
                                        <Lock size={16} className="text-purple-600" />
                                        <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest">Current Tab</h3>
                                    </div>
                                    
                                    <div className="space-y-4 mb-6">
                                        {openTabOrders.map((order: GuestOrder) => (
                                            <div key={order.order_id} className="pb-5 border-b border-purple-50 last:border-0 last:pb-0 mb-4 last:mb-0">
                                                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">
                                                    <span>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span className="text-purple-400 font-mono bg-purple-50 px-2 py-0.5 rounded-md">#{order.order_id.slice(-4)}</span>
                                                </div>
                                                {order.OrderItems?.map((item) => (
                                                    <div key={item.item_id || Math.random()} className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center gap-2 text-slate-700">
                                                            <span className="font-black text-slate-900">{item.quantity}x</span>
                                                            <span className="font-medium text-sm">{item.MenuItem?.name}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-900 text-sm">{Number(item.price_at_time).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                
                                                {/* ⚡ SPACE-SAVING UX: Conditionally collapse the tracker on Open Tabs */}
                                                {order.status !== 'COMPLETED' ? (
                                                    <MiniTracker status={order.status} theme="purple" />
                                                ) : (
                                                    <div className="mt-4 flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest pt-4 border-t border-slate-50">
                                                        <CheckCircle2 size={14} className="text-emerald-500" /> Served
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-purple-100 flex justify-between items-end mb-5">
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
                                    {paidOrders.map((order: GuestOrder) => {
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

                                                {/* ⚡ PARITY FIX: Fast-Casual orders now show the tracker until served! */}
                                                {order.status !== 'COMPLETED' && (
                                                    <MiniTracker status={order.status} theme="indigo" />
                                                )}

                                                <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-2">
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