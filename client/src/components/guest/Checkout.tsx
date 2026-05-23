import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import { AxiosError } from 'axios'; 
import { toast } from 'sonner';
import { 
    ArrowLeft, ShieldCheck, Smartphone, 
    Receipt, Loader2, CheckCircle2, User, Banknote, XCircle, CreditCard, Lock
} from 'lucide-react';

import api from '../../utils/axiosConfig'; 
import io, { Socket } from 'socket.io-client';
import { useCustomerCartStore } from '../../store/useCustomerCartStore';

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { useSubmitGuestOrder, PaymentMethod } from '../../hooks/useCheckout';

interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp?: number;
}

type PaymentStatus = 'idle' | 'pending' | 'success' | 'failed';

interface OrderStatusResponse {
    payment_status: string;
    status: string;
}

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
                onError: (error: any) => {
                    console.error("Paystack SDK Error:", error);
                    onClose();
                }
            });
        };

        if ((window as any).PaystackPop) {
            launchPaystack();
        } else {
            script.onload = launchPaystack;
        }

        return () => {
            if (script && document.body.contains(script)) {
                document.body.removeChild(script);
            }
            
            const paystackIframe = document.querySelector('iframe[name="paystack-checkout-iframe"]');
            if (paystackIframe && paystackIframe.parentNode) {
                paystackIframe.parentNode.removeChild(paystackIframe);
            }
        };
    }, [accessCode, onSuccess, onClose]);

    return null;
};

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
    
    const [mobileProvider, setMobileProvider] = useState<'mpesa' | 'airtel' | 'mtn'>('mpesa');
    const [phone, setPhone] = useState<string>('');
    
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle'); 
    const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);

    const [paystackAccessCode, setPaystackAccessCode] = useState<string>('');
    const [isGatewayLoading, setIsGatewayLoading] = useState<boolean>(false);

    const submitOrderMutation = useSubmitGuestOrder();

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

    // ⚡ SPRINT 21: The Hybrid Choice Logic
    const isTabAllowed = 
        venueConfig?.tab_operating_mode === 'ENABLED_ALL' || 
        (venueConfig?.tab_operating_mode === 'VIP_ONLY' && 
         Array.isArray(venueConfig?.vip_tables) && 
         venueConfig.vip_tables.map(t => t.toLowerCase()).includes(tableNumber.toLowerCase()));

    // Ensure state defaults to CARD if tab somehow becomes disallowed mid-session
    useEffect(() => {
        if (!isTabAllowed && paymentMethod === 'TAB') {
            setPaymentMethod('CARD'); 
        }
    }, [isTabAllowed, paymentMethod]);


    useEffect(() => {
        if (venueId && cartItems.length === 0 && paymentStatus === 'idle') {
            navigate(`/menu`); 
        }
    }, [cartItems, navigate, venueId, paymentStatus]);

    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval>;
        let socket: any;

        if (paymentStatus === 'pending' && pollingOrderId) {
            
            socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
                auth: { guest_token: localStorage.getItem('guest_token') }
            });

            socket.emit('join_order_room', pollingOrderId);

            const handleSuccess = (data: { orderId: string, method: string }) => {
                setPaymentStatus('success');
                toast.success("Payment confirmed by Gateway!");
                setTimeout(() => {
                    clearCart(); 
                    navigate(`/order-status/${data.orderId}`); 
                }, 2000);
            };

            const handleFailure = (data: { orderId: string, method: string, reason: string }) => {
                setPaymentStatus('failed');
                toast.error(`Payment Failed: ${data.reason}`);
                setTimeout(() => setPaymentStatus('idle'), 3000);
            };

            socket.on('payment:completed', handleSuccess);
            socket.on('payment:failed', handleFailure);

            pollInterval = setInterval(async () => {
                try {
                    const res = await api.get<OrderStatusResponse>(`/api/orders/${pollingOrderId}/status`);
                    const currentStatus = res.data.payment_status;

                    if (currentStatus === "PAID"){
                        handleSuccess({ orderId: pollingOrderId, method: paymentMethod });
                    } else if (currentStatus === 'FAILED' || res.data.status === 'CANCELLED' || res.data.status === 'cancelled'){
                        handleFailure({ orderId: pollingOrderId, method: paymentMethod, reason: "Cancelled or Insufficient Funds" });
                    }
                } catch (error){
                    console.error("Polling error:", error);
                }
            }, 4000);

            return () => {
                if (socket) socket.disconnect();
                clearInterval(pollInterval);
            };
        }
    }, [paymentStatus, pollingOrderId, navigate, clearCart, paymentMethod]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(e.target.value.replace(/\D/g, ''));
    };

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim()) return toast.error("Please enter your name for the order.");
        if (paymentMethod === 'M-PESA' && (phone.length < 9 || phone.length > 15)) {
            return toast.error("Please enter a valid phone number.");
        }
        if (!venueId) return toast.error("Venue session lost. Please scan QR again.");
        
        const payload = {
            venue_id: venueId,
            table_number: tableNumber,
            customer_name: customerName,
            payment_method: paymentMethod,
            phone_number: paymentMethod === 'M-PESA' ? phone : null,
            provider: paymentMethod === 'M-PESA' ? mobileProvider : undefined, 
            amount: total, 
            items: cartItems.map(item => ({ 
                item_id: item.item_id, 
                quantity: item.quantity, 
                price: item.price,
                name: item.name
            }))
        };

        submitOrderMutation.mutate(payload as any, {
            onSuccess: (data) => {
                setPollingOrderId(data.orderId);

                if (data.method === 'CASH' || data.method === 'TAB') {
                    setPaymentStatus('success');
                    toast.success(data.method === 'TAB' ? "Added to your Open Tab!" : "Order sent to kitchen! Please pay your waiter.");
                    setTimeout(() => {
                        clearCart();
                        navigate(`/order-status/${data.orderId}`); 
                    }, 2000);
                } else if (data.method === 'M-PESA') {
                    setPaymentStatus('pending'); 
                } else if (data.method === 'CARD') {
                    setPaymentStatus('pending'); 
                    setIsGatewayLoading(true); 
                    setPaystackAccessCode(data.access_code!); 
                }
            },
            onError: (error: any) => {
                console.error("Checkout Error:", error);
                const axiosError = error as AxiosError<{ message: string }>;
                toast.error(axiosError.response?.data?.message || "Checkout failed. Please try again.");
                setPaymentStatus('idle');
                setPaystackAccessCode('');
                setIsGatewayLoading(false);
            }
        });
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
                <button onClick={() => navigate(-1)} disabled={submitOrderMutation.isPending} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors disabled:opacity-50">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Checkout</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tableNumber}</p>
                </div>
                <div className={`w-10 h-10 flex items-center justify-center ${paymentMethod === 'TAB' ? 'text-purple-600' : 'text-indigo-600'}`}>
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
                            <span className={`text-2xl font-black ${paymentMethod === 'TAB' ? 'text-purple-600' : 'text-indigo-600'}`}>
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
                            <p className="text-sm text-slate-500 text-center px-6 mt-2">Enter your Mobile Money PIN on the prompt sent to <br/><span className="font-bold text-slate-800 tracking-wider">{phone}</span></p>
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
                        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-8 duration-500 ${paymentMethod === 'TAB' ? 'bg-purple-600' : 'bg-emerald-500'}`}>
                            {paymentMethod === 'TAB' ? <Lock size={64} className="mb-4" /> : <CheckCircle2 size={64} className="mb-4" />}
                            <h3 className="text-2xl font-black">{paymentMethod === 'TAB' ? 'Added to Tab!' : 'Order Confirmed!'}</h3>
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
                                    disabled={submitOrderMutation.isPending}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all disabled:opacity-50 shadow-inner"
                                />
                            </div>
                        </div>

                        {/* ⚡ SPRINT 21: THE HYBRID MATRIX */}
                        <div className="space-y-2 animate-in fade-in">
                            <label className="text-sm font-bold text-slate-700 ml-1 flex items-center justify-between">
                                Payment Method
                                {isTabAllowed && <span className="text-[10px] text-purple-600 font-black uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-100">VIP Active</span>}
                            </label>
                            
                            <div className={`grid gap-3 grid-cols-2 md:grid-cols-2`}>
                                
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
                                    <span className="font-bold text-xs text-center">Mobile Money</span>
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

                                {/* Option C: Bypasses immediate checkout completely */}
                                {isTabAllowed && (
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('TAB')}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'TAB' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <Lock size={24} />
                                        <span className="font-bold text-xs">Open Tab</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {paymentMethod === 'M-PESA' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Select Network</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setMobileProvider('mpesa')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${mobileProvider === 'mpesa' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500'}`}>M-Pesa</button>
                                        <button type="button" onClick={() => setMobileProvider('airtel')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${mobileProvider === 'airtel' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500'}`}>Airtel</button>
                                        <button type="button" onClick={() => setMobileProvider('mtn')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${mobileProvider === 'mtn' ? 'border-yellow-500 bg-yellow-50 text-yellow-600' : 'border-slate-200 text-slate-500'}`}>MTN MoMo</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number</label>
                                    <input 
                                        type="tel" 
                                        required
                                        placeholder="07XX XXX XXX"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        disabled={submitOrderMutation.isPending}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#52B44B]/50 focus:bg-white transition-all disabled:opacity-50 shadow-inner text-center text-lg"
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={submitOrderMutation.isPending || (paymentMethod === 'M-PESA' && phone.length < 9)}
                            className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                paymentMethod === 'TAB' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30' :
                                paymentMethod === 'M-PESA' ? 'bg-[#52B44B] hover:bg-[#459e3f] shadow-[#52B44B]/30' : 
                                paymentMethod === 'CARD' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' :
                                'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30'
                            }`}
                        >
                            {paymentMethod === 'TAB' ? 'Put it on my Tab' : 
                             paymentMethod === 'M-PESA' || paymentMethod === 'CARD' ? `Pay ${total.toLocaleString('en-KE')}` : 
                             'Send Order to Kitchen'}
                        </button>
                    </form>
                </div>
            </main>

            {isGatewayLoading && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    <Loader2 size={48} className="animate-spin mb-4 text-indigo-400" />
                    <h3 className="text-xl font-black tracking-wide">Connecting to your bank...</h3>
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
                        setPaymentStatus('idle');
                        toast.error("Payment window closed.");
                    }}
                />
            )}
        </div>
    );
}