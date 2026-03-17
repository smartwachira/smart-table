import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
    ArrowLeft, ShieldCheck, Smartphone, 
    Receipt, Loader2, CheckCircle2, User, Banknote
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Checkout() {
    const { venueId } = useParams();
    const [searchParams] = useSearchParams();
    const tableNumber = searchParams.get('table') || 'Takeaway';
    const navigate = useNavigate();
    
    const { cart, cartTotals, clearCart } = useCart();
    const cartItems = Object.values(cart);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('M-PESA'); // 'M-PESA' or 'CASH'
    const [phone, setPhone] = useState('');
    
    // Process State
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, pending, success

    useEffect(() => {
        if (cartItems.length === 0 && paymentStatus === 'idle') {
            navigate(`/menu/${venueId}?table=${tableNumber}`);
        }
    }, [cartItems, navigate, venueId, tableNumber, paymentStatus]);

    const handlePhoneChange = (e) => {
        setPhone(e.target.value.replace(/\D/g, ''));
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (!customerName.trim()) return toast.error("Please enter your name for the order.");
        
        if (paymentMethod === 'M-PESA' && (phone.length < 9 || phone.length > 12)) {
            return toast.error("Please enter a valid Safaricom phone number.");
        }

        setIsProcessing(true);

        try {
            // STEP 1: CREATE THE ORDER FIRST
            const orderPayload = {
                venue_id: venueId,
                table_number: tableNumber,
                customer_name: customerName,
                payment_method: paymentMethod,
                phone_number: paymentMethod === 'M-PESA' ? phone : null,
                amount: cartTotals.total,
                items: cartItems.map(item => ({ 
                    item_id: item.item_id, 
                    quantity: item.quantity, 
                    price: item.price,
                    name: item.name
                }))
            };
            
            const orderRes = await axios.post('/api/orders', orderPayload);
            const orderId = orderRes.data.orderId;

            // STEP 2: HANDLE PAYMENT ROUTING
            if (paymentMethod === 'CASH') {
                // Cash Flow: Done immediately
                setPaymentStatus('success');
                toast.success("Order sent to kitchen! Please pay your waiter.");
                
                setTimeout(() => {
                    clearCart();
                    navigate(`/order-status/${orderId}?venue=${venueId}`);
                }, 2000);

            } else {
                // M-Pesa Flow: Trigger STK Push
                setPaymentStatus('pending');
                await axios.post('/api/mpesa/stkpush', { orderId, phone });
                
                // Wait briefly for user to interact with phone prompt
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                setPaymentStatus('success');
                setTimeout(() => {
                    clearCart();
                    navigate(`/order-status/${orderId}?venue=${venueId}`);
                }, 2000);
            }

        } catch (error) {
            console.error("Checkout Error:", error);
            toast.error(error.response?.data?.message || "Checkout failed. Please try again.");
            setPaymentStatus('idle');
            setIsProcessing(false);
        }
    };

    if (cartItems.length === 0 && paymentStatus === 'idle') return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12 relative overflow-hidden">
            
            {/* Header */}
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
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
                
                {/* Order Summary */}
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
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-900">
                        <span className="text-lg font-black">Total</span>
                        <span className="text-2xl font-black text-indigo-600">
                            {cartTotals.total.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>

                {/* Checkout Form */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                    
                    {/* Processing Overlays */}
                    {paymentStatus === 'pending' && (
                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 relative">
                                <Loader2 size={32} className="animate-spin absolute" />
                                <Smartphone size={20} className="animate-pulse" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Check your phone!</h3>
                            <p className="text-sm text-slate-500 text-center px-6 mt-2">Enter your M-Pesa PIN on the prompt sent to <br/><span className="font-bold text-slate-800 tracking-wider">{phone}</span></p>
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
                        
                        {/* Customer Details */}
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Payment Method Toggle */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('M-PESA')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'M-PESA' ? 'border-[#52B44B] bg-[#52B44B]/5 text-[#52B44B]' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                >
                                    <Smartphone size={24} />
                                    <span className="font-bold text-sm">M-Pesa</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('CASH')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'CASH' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                                >
                                    <Banknote size={24} />
                                    <span className="font-bold text-sm">Pay Waiter</span>
                                </button>
                            </div>
                        </div>

                        {/* Conditional Phone Input */}
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#52B44B]/50 focus:bg-white transition-all disabled:opacity-50"
                                />
                            </div>
                        )}

                        {/* Dynamic Submit Button */}
                        <button 
                            type="submit"
                            disabled={isProcessing ||!phone}
                            className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                paymentMethod === 'M-PESA' 
                                ? 'bg-[#52B44B] hover:bg-[#459e3f] shadow-[#52B44B]/30' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                            }`}
                        >
                            {paymentMethod === 'M-PESA' ? `Pay ${cartTotals.total.toLocaleString('en-KE')}` : 'Send Order to Kitchen'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}