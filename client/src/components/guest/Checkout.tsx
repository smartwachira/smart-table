import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import { AxiosError } from 'axios'; 
import { toast } from 'sonner';
import { usePaystackPayment } from 'react-paystack'; 
import { 
    ArrowLeft, ShieldCheck, Smartphone, 
    Receipt, Loader2, CheckCircle2, User, Banknote, XCircle, CreditCard 
} from 'lucide-react';

import api from '../../utils/axiosConfig'; 
import { useCustomerCartStore } from '../../store/useCustomerCartStore';

// 🛡️ Explicit Interfaces
interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp?: number;
}

type PaymentMethod = 'M-PESA' | 'CASH' | 'CARD'; 
type PaymentStatus = 'idle' | 'pending' | 'success' | 'failed';

interface OrderStatusResponse {
    payment_status: string;
    status: string;
}

// 🛡️ Strict typing for the backend initialization response
interface PaystackInitResponse {
    reference: string;
    access_code: string;
    authorization_url: string;
}

export default function Checkout() {
    const navigate = useNavigate();
    
    const { cart, clearCart, venueConfig } = useCustomerCartStore();
    const cartItems = Object.values(cart);

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = venueConfig?.tax_rate ? Number(venueConfig.tax_rate) / 100 : 0;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const [venueId, setVenueId] = useState<string | null>(null);
    const [tableNumber, setTableNumber] = useState<string>('');
    const [orderMode, setOrderMode] = useState<'KIOSK' | 'TAB'>('TAB'); 

    const [customerName, setCustomerName] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD'); 
    const [phone, setPhone] = useState<string>('');
    
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle'); 
    const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);

    // ⚡ PAYSTACK STATE
    const [paystackReference, setPaystackReference] = useState<string>('');

    // The hook automatically re-registers when `paystackReference` changes
    const initializePaystack = usePaystackPayment({
        reference: paystackReference,
        email: "guest@smarttable.com", 
        amount: Math.round(total * 100), // Enforce cents mathematically
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    });

    const onPaystackSuccess = (reference: any) => {
        setPaymentStatus('success');
        toast.success("Card Payment Successful!");
        
        setTimeout(() => {
            clearCart();
            if (pollingOrderId) navigate(`/order-status/${pollingOrderId}`); 
        }, 2000);
    };

    const onPaystackClose = () => {
        setPaymentStatus('idle');
        setIsProcessing(false);
        setPaystackReference(''); // Reset reference to allow re-trying
        toast.error("Payment window closed.");
    };

    // ⚡ THE FIX: Safe lifecycle trigger. Watches for the reference to update before popping the modal.
    useEffect(() => {
        if (paystackReference && paymentStatus === 'pending' && paymentMethod === 'CARD') {
            (initializePaystack as Function)(onPaystackSuccess, onPaystackClose);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paystackReference]);

    useEffect(() => {
        const token = localStorage.getItem('guest_token');
        if (token) {
            try {
                const decoded = jwtDecode<GuestJwtPayload>(token);
                if (decoded.role === 'GUEST') {
                    setVenueId(decoded.venueId);
                    setTableNumber(decoded.tableName);
                    setOrderMode(decoded.orderMode || 'TAB');
                } else {
                    navigate('/scan', { replace: true });
                }
            } catch (error) {
                navigate('/scan', { replace: true });
            }
        } else {
            navigate('/scan', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (venueId && cartItems.length === 0 && paymentStatus === 'idle') {
            navigate(`/menu`); 
        }
    }, [cartItems, navigate, venueId, paymentStatus]);

    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval>;

        if (paymentStatus === 'pending' && pollingOrderId && paymentMethod === 'M-PESA'){
            pollInterval = setInterval(async () => {
                try {
                    const res = await api.get<OrderStatusResponse>(`/api/orders/${pollingOrderId}/status`);
                    const currentStatus = res.data.payment_status;

                    if (currentStatus === "PAID"){
                        clearInterval(pollInterval);
                        setPaymentStatus('success');
                        toast.success("Payment confirmed!");

                        setTimeout(() => {
                            clearCart(); 
                            navigate(`/order-status/${pollingOrderId}`); 
                        }, 2000);
                    } else if (currentStatus === 'FAILED' || res.data.status === 'CANCELLED'){
                        clearInterval(pollInterval);
                        setPaymentStatus('failed');
                        setIsProcessing(false);
                        toast.error("Payment failed, timed out, or was cancelled.");
                        setTimeout(() => setPaymentStatus('idle'), 3000);
                    }
                } catch (error){
                    console.error("Polling error:", error);
                }
            }, 3000);
        }
        
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [paymentStatus, pollingOrderId, navigate, clearCart, paymentMethod]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(e.target.value.replace(/\D/g, ''));
    };

    const handleCheckoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim()) return toast.error("Please enter your name for the order.");
        
        if (paymentMethod === 'M-PESA' && (phone.length < 9 || phone.length > 12)) {
            return toast.error("Please enter a valid phone number.");
        }

        setIsProcessing(true);

        try {
            const orderPayload = {
                venue_id: venueId,
                table_number: tableNumber,
                customer_name: customerName,
                payment_method: paymentMethod,
                phone_number: paymentMethod === 'M-PESA' ? phone : null,
                amount: total, 
                items: cartItems.map(item => ({ 
                    item_id: item.item_id, 
                    quantity: item.quantity, 
                    price: item.price,
                    name: item.name
                }))
            };
            
            // 🛡️ Strict generic applied to Axios response
            const orderRes = await api.post<{ orderId: string }>('/api/orders', orderPayload);
            const orderId = orderRes.data.orderId;
            setPollingOrderId(orderId);

            if (paymentMethod === 'CASH') {
                setPaymentStatus('success');
                toast.success("Order sent to kitchen! Please pay your waiter.");
                setTimeout(() => {
                    clearCart();
                    navigate(`/order-status/${orderId}`); 
                }, 2000);

            } else if (paymentMethod === 'M-PESA') {
                setPaymentStatus('pending');
                await api.post('/api/mpesa/stkpush', { orderId, phone });
                
            } else if (paymentMethod === 'CARD') {
                setPaymentStatus('pending'); 
                toast.loading("Connecting to secure gateway...", { id: 'gateway-load' });

                // 🛡️ Strict generic applied to Paystack initialization response
                const initRes = await api.post<PaystackInitResponse>('/api/paystack/initialize', { orderId });
                
                toast.dismiss('gateway-load');
                
                // Triggers the useEffect above to pop the modal safely
                setPaystackReference(initRes.data.reference);
            }

        } catch (error) {
            console.error("Checkout Error:", error);
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || "Checkout failed. Please try again.");
            toast.dismiss('gateway-load');
            setPaymentStatus('idle');
            setIsProcessing(false);
            setPaystackReference('');
        }
    };

    if (!venueId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    if (cartItems.length === 0 && paymentStatus === 'idle') return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12 relative overflow-hidden">
            
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <button onClick={() => navigate(-1)} disabled={isProcessing} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors disabled:opacity-50">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Checkout</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tableNumber}</p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center text-indigo-600">
                    <ShieldCheck size={24} />
                </div>
            </header>

            <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Receipt size={16} /> Order Summary
                    </h2>
                    <div className="space-y-3 mb-4">
                        {cartItems.map(item => (
                            <div key={item.item_id} className="flex justify-between items-start text-slate-700">
                                <div className="flex gap-2">
                                    <span className="font-bold text-slate-900">{item.quantity}x</span>
                                    <span>{item.name}</span>
                                </div>
                                <span className="font-semibold">{(item.price * item.quantity).toLocaleString('en-KE')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                       <div className="flex justify-between text-slate-500 font-medium text-sm">
                            <span>Subtotal</span>
                            <span>{subtotal.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}</span>
                        </div>
                        {taxAmount > 0 && (
                            <div className="flex justify-between text-slate-500 font-medium text-sm">
                                <span>Taxes & Fees ({(taxRate * 100).toFixed(0)}%)</span>
                                <span>{taxAmount.toLocaleString('en-KE',{ style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-slate-900 pt-2 border-t border-slate-100 mt-2">
                            <span className="text-lg font-black">Total</span>
                            <span className="text-2xl font-black text-indigo-600">
                                {total.toLocaleString('en-KE',{ style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                    
                    {paymentStatus === 'pending' && paymentMethod === 'M-PESA' && (
                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 relative">
                                <Loader2 size={32} className="animate-spin absolute" />
                                <Smartphone size={20} className="animate-pulse" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Check your phone!</h3>
                            <p className="text-sm text-slate-500 text-center px-6 mt-2">Enter your M-Pesa PIN on the prompt sent to <br/><span className="font-bold text-slate-800 tracking-wider">{phone}</span></p>
                        </div>
                    )}

                    {paymentStatus === 'failed' && (
                        <div className="absolute inset-0 z-30 bg-red-500 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-8 duration-300">
                            <XCircle size={64} className="mb-4" />
                            <h3 className="text-2xl font-black">Payment Failed</h3>
                            <p className="opacity-90 font-medium mt-1">Please try again.</p>
                        </div>
                    )}

                    {paymentStatus === 'success' && (
                        <div className="absolute inset-0 z-30 bg-emerald-500 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-8 duration-500">
                            <CheckCircle2 size={64} className="mb-4" />
                            <h3 className="text-2xl font-black">Order Confirmed!</h3>
                            <p className="opacity-90 font-medium mt-1">Routing to kitchen...</p>
                        </div>
                    )}

                    <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Your Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="What should we call you?"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all disabled:opacity-50 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Payment Method</label>
                            <div className={`grid gap-3 ${venueConfig?.allow_cash_payments ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                
                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('CARD')}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'CARD' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                >
                                    <CreditCard size={24}/>
                                    <span className="font-bold text-xs">Bank Card</span>
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('M-PESA')}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'M-PESA' ? 'border-[#52B44B] bg-[#52B44B]/5 text-[#52B44B] shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                >
                                    <Smartphone size={24}/>
                                    <span className="font-bold text-xs">M-Pesa</span>
                                </button>

                                {venueConfig?.allow_cash_payments && (
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('CASH')}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'CASH' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <Banknote size={24} />
                                        <span className="font-bold text-xs">Pay Waiter</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {paymentMethod === 'M-PESA' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">M-Pesa Number</label>
                                <input 
                                    type="tel" 
                                    required
                                    placeholder="07XX XXX XXX"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    disabled={isProcessing}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#52B44B]/50 focus:bg-white transition-all disabled:opacity-50 shadow-inner text-center text-lg"
                                />
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isProcessing }
                            className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                paymentMethod === 'M-PESA' ? 'bg-[#52B44B] hover:bg-[#459e3f] shadow-[#52B44B]/30' : 
                                paymentMethod === 'CARD' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' :
                                'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30'
                            }`}
                        >
                            {paymentMethod === 'M-PESA' || paymentMethod === 'CARD' ? `Pay ${total.toLocaleString('en-KE')}` : 'Send Order to Kitchen'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}