import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
// ⚡ SPRINT 21 FIX: Added ArrowLeft to the imports
import { 
    X, Receipt, ChefHat, BellRing, CheckCircle2, Clock, AlertCircle, 
    Lock, Banknote, Smartphone, CreditCard, ChevronRight, Loader2, ArrowLeft 
} from 'lucide-react';
import { useGuestSessionStore } from '../../store/useGuestSessionStore';

import { useGuestOrders, useSettleGuestTab, GuestOrder } from '../../hooks/useGuestOrders';

interface MyOrdersDrawerProps {
    isOpen: boolean;
    onOpen: () => void; 
    onClose: () => void;
    venueId: string | null;
}

const statusConfig = {
    PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Received' },
    PREPARING: { icon: ChefHat, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cooking' },
    READY: { icon: BellRing, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Ready for Table' },
    COMPLETED: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Served' },
    CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
};

const NativePaystackLauncher = ({ accessCode, onSuccess, onClose }: { accessCode: string, onSuccess: Function, onClose: Function }) => {
    useEffect(() => {
        const scriptId = 'paystack-v2-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.async = true;
            document.body.appendChild(script);
        }

        const launchPaystack = () => {
            const popup = new (window as any).PaystackPop();
            popup.resumeTransaction(accessCode, {
                onSuccess: (response: any) => onSuccess(response),
                onCancel: () => onClose(),
                onError: (error: any) => { console.error("Paystack SDK Error:", error); onClose(); }
            });
        };

        if ((window as any).PaystackPop) launchPaystack();
        else script.onload = launchPaystack;

        return () => {
            if (script && document.body.contains(script)) document.body.removeChild(script);
            const paystackIframe = document.querySelector('iframe[name="paystack-checkout-iframe"]');
            if (paystackIframe && paystackIframe.parentNode) paystackIframe.parentNode.removeChild(paystackIframe);
        };
    }, [accessCode, onSuccess, onClose]);

    return null;
};

export default function MyOrdersDrawer({ isOpen, onOpen, onClose, venueId }: MyOrdersDrawerProps) {
    const queryClient = useQueryClient();
    const guestSessionId = useGuestSessionStore((state) => state.guestSessionId);

    const [isSettlingTab, setIsSettlingTab] = useState(false);
    
    const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'M-PESA' | 'CASH' | null>(null);
    const [phone, setPhone] = useState('');
    const [mobileProvider, setMobileProvider] = useState<'mpesa' | 'airtel' | 'mtn'>('mpesa');
    const [paystackAccessCode, setPaystackAccessCode] = useState<string>('');
    const [isGatewayLoading, setIsGatewayLoading] = useState<boolean>(false);

    // ⚡ Typed the orders array correctly
    const { data: orders = [], isLoading, error } = useGuestOrders(guestSessionId);
    const settleTabMutation = useSettleGuestTab();

    useEffect(() => {
        if (!venueId) return;
        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socket.emit('join_venue', venueId);

        const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['guestOrders', guestSessionId] });

        socket.on('order:created', refreshOrders);
        socket.on('order:status_updated', refreshOrders);
        socket.on('payment:completed', (data) => {
            refreshOrders();
            setIsSettlingTab(false);
            if (data.method !== 'CASH') toast.success("Tab settled successfully!");
        });
        socket.on('order:cancelled', refreshOrders);
        socket.on('payment:failed', (data) => toast.error(`Payment failed: ${data.reason}`));

        return () => {
            socket.off('order:created'); socket.off('order:status_updated');
            socket.off('payment:completed'); socket.off('order:cancelled'); socket.off('payment:failed');
            socket.disconnect();
        };
    }, [venueId, queryClient, guestSessionId]);

    const openTabOrders = orders.filter((o: GuestOrder) => o.payment_method === 'TAB' && o.payment_status === 'PENDING' && o.status !== 'CANCELLED');
    const tabTotal = openTabOrders.reduce((sum: number, o: GuestOrder) => sum + Number(o.total_amount), 0);
    const historyOrders = orders.filter((o: GuestOrder) => !openTabOrders.includes(o));

    const handleSettleTab = (method: 'CARD' | 'M-PESA' | 'CASH') => {
        const orderIds = openTabOrders.map((o: GuestOrder) => o.order_id);
        
        settleTabMutation.mutate(
            { orderIds, payment_method: method, phone: method === 'M-PESA' ? phone : undefined, provider: method === 'M-PESA' ? mobileProvider : undefined },
            {
                onSuccess: (data) => {
                    if (data.method === 'CASH') {
                        toast.success("Waiter notified! Please have cash ready.");
                        setIsSettlingTab(false);
                        setSelectedMethod(null);
                    } else if (data.method === 'CARD') {
                        setPaystackAccessCode(data.access_code);
                        setIsGatewayLoading(true);
                    } else if (data.method === 'M-PESA') {
                        toast.success("Push sent! Check your phone.");
                        setIsSettlingTab(false);
                        setSelectedMethod(null);
                    }
                },
                onError: (err: any) => toast.error(err.response?.data?.message || "Checkout failed.")
            }
        );
    };

    if (!isOpen) {
        if (!orders || orders.length === 0) return null;
        const activeOrders = orders.filter((o: GuestOrder) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        if (activeOrders.length === 0) return null;

        const totalActiveItems = activeOrders.reduce((acc: number, order: GuestOrder) => acc + order.OrderItems.reduce((sum: number, item: any) => sum + item.quantity, 0), 0);
        const itemNamesPreview = activeOrders.flatMap((o: GuestOrder) => o.OrderItems.map((i: any) => i.MenuItem?.name)).filter(Boolean);
        const previewText = [...new Set(itemNamesPreview)].slice(0, 2).join(', ') + (itemNamesPreview.length > 2 ? '...' : '');

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
                        <span className="text-[10px] font-medium text-slate-300 truncate max-w-[120px]">{previewText}</span>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:flex-row">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

            <div className="relative w-full md:w-[450px] h-[85dvh] md:h-[100dvh] bg-slate-50 shadow-2xl flex flex-col rounded-t-[2rem] md:rounded-none animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
                
                <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between rounded-t-[2rem] md:rounded-none sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {isSettlingTab ? (
                            <button onClick={() => { setIsSettlingTab(false); setSelectedMethod(null); }} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center transition-colors hover:bg-slate-200">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><Receipt size={20} /></div>
                        )}
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{isSettlingTab ? 'Settle Tab' : 'My Orders'}</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors active:scale-95"><X size={20} /></button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-24 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <Clock size={32} className="animate-spin mb-4 text-indigo-400" />
                            <p className="font-bold tracking-widest uppercase text-xs">Loading Tab...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-500 mb-2" />
                            <p className="text-red-800 font-medium text-sm">Failed to load your orders. Please check your connection.</p>
                        </div>
                    ) : !orders || orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                            <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm"><Receipt size={32} /></div>
                            <h3 className="text-lg font-black text-slate-900">No active orders</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1 max-w-[250px]">Items you order during this session will appear here.</p>
                        </div>
                    ) : isSettlingTab ? (
                        
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <div className="bg-purple-600 rounded-[2rem] p-8 text-center text-white shadow-lg">
                                <span className="text-purple-200 font-bold uppercase tracking-widest text-xs block mb-2">Total Outstanding</span>
                                <h3 className="text-4xl font-black tracking-tight">{tabTotal.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}</h3>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-900 text-sm ml-1 mb-3">Select Payment Method</h4>
                                
                                <button onClick={() => handleSettleTab('CARD')} disabled={settleTabMutation.isPending} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl active:scale-95 transition-all group shadow-sm disabled:opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center"><CreditCard size={24} className="text-indigo-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-slate-900">Bank Card</span>
                                            <span className="text-xs text-slate-500 font-bold">Pay via secure gateway</span>
                                        </div>
                                    </div>
                                    {settleTabMutation.isPending && selectedMethod === 'CARD' ? <Loader2 className="animate-spin text-slate-400" size={20}/> : <ChevronRight size={24} className="text-slate-400 group-hover:translate-x-1 transition-transform"/>}
                                </button>

                                <div className="space-y-2">
                                    <button onClick={() => setSelectedMethod(selectedMethod === 'M-PESA' ? null : 'M-PESA')} disabled={settleTabMutation.isPending} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl active:scale-95 transition-all group shadow-sm disabled:opacity-50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center"><Smartphone size={24} className="text-emerald-600"/></div>
                                            <div className="text-left">
                                                <span className="block font-black text-slate-900">Mobile Money</span>
                                                <span className="text-xs text-slate-500 font-bold">M-Pesa, Airtel, MTN</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={24} className={`text-slate-400 transition-transform ${selectedMethod === 'M-PESA' ? 'rotate-90' : 'group-hover:translate-x-1'}`}/>
                                    </button>

                                    {selectedMethod === 'M-PESA' && (
                                        <div className="p-4 bg-slate-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex gap-2">
                                                <button onClick={() => setMobileProvider('mpesa')} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${mobileProvider === 'mpesa' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-500'}`}>M-Pesa</button>
                                                <button onClick={() => setMobileProvider('airtel')} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${mobileProvider === 'airtel' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-500'}`}>Airtel</button>
                                            </div>
                                            <input type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center" />
                                            <button onClick={() => handleSettleTab('M-PESA')} disabled={phone.length < 9 || settleTabMutation.isPending} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl active:scale-95 transition-all disabled:opacity-50">
                                                {settleTabMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Send Prompt'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => handleSettleTab('CASH')} disabled={settleTabMutation.isPending} className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl active:scale-95 transition-all group disabled:opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"><Banknote size={24} className="text-amber-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-amber-900">Pay Waiter</span>
                                            <span className="text-xs text-amber-700 font-bold">Cash or Terminal</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                    ) : (

                        <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-8">
                            
                            {openTabOrders.length > 0 && (
                                <div className="space-y-4">
                                    <div className="bg-purple-100 p-5 rounded-[2rem] border border-purple-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Lock size={18} className="text-purple-600" />
                                            <h3 className="font-black text-purple-900 tracking-tight">Current Tab</h3>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            {openTabOrders.map((order: GuestOrder) => (
                                                <div key={order.order_id} className="bg-white p-3 rounded-2xl shadow-sm border border-purple-100">
                                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-500">Order #{order.order_id.slice(-4)}</span>
                                                    </div>
                                                    {order.OrderItems && order.OrderItems.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-start text-sm py-1">
                                                            <div className="flex gap-2 text-slate-700">
                                                                <span className="font-black text-purple-600">{item.quantity}x</span>
                                                                <span className="font-medium text-slate-800">{item.MenuItem?.name}</span>
                                                            </div>
                                                            <span className="text-slate-500 font-bold text-xs">{(Number(item.price_at_time) * item.quantity).toLocaleString('en-KE')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-purple-200/50 mb-5">
                                            <span className="text-purple-800 font-bold text-sm uppercase tracking-widest">Tab Total</span>
                                            <span className="text-2xl font-black text-purple-900">
                                                {tabTotal.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                                            </span>
                                        </div>

                                        <button onClick={() => setIsSettlingTab(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2">
                                            Settle Tab
                                        </button>
                                    </div>
                                </div>
                            )}

                            {historyOrders.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2 px-1">
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                        Paid & Processing
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {historyOrders.map((order: GuestOrder) => {
                                            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig['PENDING'];
                                            const StatusIcon = config.icon;

                                            return (
                                                <div key={order.order_id} className="bg-white rounded-[1.5rem] p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    
                                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                                                                <StatusIcon size={16} className={order.status === 'PREPARING' || order.status === 'READY' ? 'animate-pulse' : ''} />
                                                            </div>
                                                            <span className={`text-xs font-black tracking-wider uppercase ${config.color}`}>
                                                                {config.label}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400">
                                                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2 mb-4">
                                                        {order.OrderItems && order.OrderItems.map((item: any, idx: number) => {
                                                            const itemName = item.MenuItem?.name || 'Unknown Item';
                                                            const lineTotal = Number(item.price_at_time || 0) * item.quantity;

                                                            return (
                                                                <div key={idx} className="flex justify-between items-start text-sm">
                                                                    <div className="flex gap-2 text-slate-700">
                                                                        <span className="font-black text-slate-900">{item.quantity}x</span>
                                                                        <span className="font-medium">{itemName}</span>
                                                                    </div>
                                                                    <span className="text-slate-500 font-semibold">
                                                                        {lineTotal.toLocaleString('en-KE')}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 px-5 py-3">
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                                            {order.payment_method === 'CASH' && order.payment_status === 'PENDING' ? (
                                                                <><Banknote size={14} className="text-amber-500"/> Waiter Notified</>
                                                            ) : (
                                                                <><CheckCircle2 size={14} className="text-emerald-500"/> Paid via {order.payment_method}</>
                                                            )}
                                                        </span>
                                                        <span className="text-sm font-black text-slate-900">
                                                            {Number(order.total_amount).toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </main>
            </div>

            {isGatewayLoading && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    <Loader2 size={48} className="animate-spin mb-4 text-indigo-400" />
                    <h3 className="text-xl font-black tracking-wide">Connecting to Gateway...</h3>
                    <p className="text-slate-300 text-sm mt-2 font-medium">Secured by Paystack</p>
                </div>
            )}

            {paystackAccessCode && (
                <NativePaystackLauncher 
                    accessCode={paystackAccessCode}
                    onSuccess={() => {
                        setPaystackAccessCode(''); 
                        setIsGatewayLoading(false); 
                        toast.success("Authorizing payment...");
                    }}
                    onClose={() => {
                        setPaystackAccessCode(''); 
                        setIsGatewayLoading(false); 
                        toast.error("Payment window closed.");
                    }}
                />
            )}
        </div>
    );
}