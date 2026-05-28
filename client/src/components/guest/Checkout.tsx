import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import { toast } from 'sonner';
import { 
    ArrowLeft, ShieldCheck, Receipt, Loader2, User, Banknote, CreditCard, Lock
} from 'lucide-react';
import { useCustomerCartStore } from '../../store/useCustomerCartStore';
import { useSubmitGuestOrder } from '../../hooks/useCheckout';

// ⚡ SPRINT 22: IMPORT THE UNIVERSAL ENGINE
import SmartPaymentEngine from '../shared/SmartPaymentEngine'; 

interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp?: number;
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
    const [customerName, setCustomerName] = useState<string>('');

    // ⚡ SPRINT 22: Universal Engine State
    const [isEngineOpen, setIsEngineOpen] = useState(false);
    const [engineOrderIds, setEngineOrderIds] = useState<string[]>([]);
    const [engineAmount, setEngineAmount] = useState<number>(0);

    const submitOrderMutation = useSubmitGuestOrder();

    useEffect(() => {
        const token = localStorage.getItem('guest_token');
        if (token) {
            try {
                const decoded = jwtDecode<GuestJwtPayload>(token);
                if (decoded.role === 'GUEST') {
                    setVenueId(decoded.venueId);
                    setTableNumber(decoded.tableName);
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

    const isTabAllowed = 
        venueConfig?.tab_operating_mode === 'ENABLED_ALL' || 
        (venueConfig?.tab_operating_mode === 'VIP_ONLY' && 
         Array.isArray(venueConfig?.vip_tables) && 
         venueConfig.vip_tables.map((t: string) => t.toLowerCase()).includes(tableNumber.toLowerCase()));

    useEffect(() => {
        if (venueId && cartItems.length === 0) navigate(`/menu`); 
    }, [cartItems, navigate, venueId]);

    // ⚡ SPRINT 22: Decoupled Submission Logic
    const handleCheckoutSubmit = (method: 'CASH' | 'TAB' | 'DIGITAL') => {
        if (!customerName.trim()) return toast.error("Please enter your name for the order.");
        if (!venueId) return toast.error("Venue session lost. Please scan QR again.");
        
        // We pass CARD as a placeholder for digital; the Engine dynamically overrides it with M-Pesa if selected by the user later
        const backendMethod = method === 'DIGITAL' ? 'CARD' : method;

        const payload = {
            venue_id: venueId,
            table_number: tableNumber,
            customer_name: customerName,
            payment_method: backendMethod,
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
                if (method === 'DIGITAL') {
                    // Trigger Universal Engine Handover
                    setEngineOrderIds([data.orderId]);
                    setEngineAmount(total);
                    setIsEngineOpen(true);
                } else {
                    // Physical Settlement Handover
                    toast.success(method === 'TAB' ? "Added to your Open Tab!" : "Order sent! Please pay your waiter.");
                    setTimeout(() => {
                        clearCart();
                        navigate(`/order-status/${data.orderId}`); 
                    }, 1500);
                }
            },
            onError: () => toast.error("Checkout failed. Please try again.")
        });
    };

    if (!venueId) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12 relative overflow-hidden">
            <header className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <button onClick={() => navigate(-1)} disabled={submitOrderMutation.isPending} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors disabled:opacity-50"><ArrowLeft size={20} /></button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Checkout</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tableNumber}</p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center text-indigo-600"><ShieldCheck size={24} /></div>
            </header>

            <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Receipt size={16} /> Order Summary</h2>
                    <div className="space-y-3 mb-4">
                        {cartItems.map(item => (
                            <div key={item.item_id} className="flex justify-between items-start text-slate-700">
                                <div className="flex gap-2"><span className="font-bold text-slate-900">{item.quantity}x</span><span>{item.name}</span></div>
                                <span className="font-semibold">{(item.price * item.quantity).toLocaleString('en-KE')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-slate-900 pt-2 border-t border-slate-100 mt-2">
                            <span className="text-lg font-black">Total</span>
                            <span className="text-2xl font-black text-indigo-600">{total.toLocaleString('en-KE',{ style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="space-y-2 mb-6">
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                        <button onClick={() => handleCheckoutSubmit('DIGITAL')} disabled={submitOrderMutation.isPending || !customerName.trim()} className="md:col-span-2 flex items-center justify-center gap-2 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                            {submitOrderMutation.isPending ? <Loader2 className="animate-spin" /> : <><CreditCard size={20} /> Pay Digitally (Card/M-Pesa)</>}
                        </button>

                        {venueConfig?.allow_cash_payments && (
                            <button onClick={() => handleCheckoutSubmit('CASH')} disabled={submitOrderMutation.isPending || !customerName.trim()} className="flex items-center justify-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50">
                                <Banknote size={20} /> Pay Waiter
                            </button>
                        )}

                        {isTabAllowed && (
                            <button onClick={() => handleCheckoutSubmit('TAB')} disabled={submitOrderMutation.isPending || !customerName.trim()} className="flex items-center justify-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50">
                                <Lock size={20} /> Open Tab
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* ⚡ SPRINT 22: THE UNIVERSAL PAYMENT ENGINE */}
            <SmartPaymentEngine 
                isOpen={isEngineOpen}
                onClose={() => setIsEngineOpen(false)}
                amount={engineAmount}
                orderIds={engineOrderIds}
                venueId={venueId}
                onSuccessCallback={() => {
                    clearCart();
                    navigate(`/order-status/${engineOrderIds[0]}`);
                }}
            />
        </div>
    );
}