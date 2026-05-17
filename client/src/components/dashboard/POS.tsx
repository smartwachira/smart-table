import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
    Search, ShoppingCart, Plus, Minus, Trash2,Loader2, 
    Smartphone, Banknote, ChefHat, User, Hash, X, MonitorSmartphone, ChevronRight, CreditCard, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore'; 
import { useMenuStore } from '../../store/useMenuStore'; 
import { socket } from '../../utils/socket'; 

// ⚡ IMPORT THE NEW CUSTOM HOOKS AND TYPES
import { 
    usePOSCategories, usePOSItems, useSubmitPOSOrder, 
    POSCategory, POSItem, getImageUrl 
} from '../../hooks/usePOS';

interface OrderStatusResponse {
    payment_status: string;
    status: string;
}

// ⚡ V2 FIX: Aggressive Teardown & DOM Cleanup
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

export default function POS() {
    const { token, venueId } = useAuth();
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCartStore();
    const { searchQuery, activeCategoryId, setSearchQuery, setActiveCategory } = useMenuStore();
    
    const [tableNumber, setTableNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    const [paystackAccessCode, setPaystackAccessCode] = useState<string>('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null); 
    const [isGatewayLoading, setIsGatewayLoading] = useState<boolean>(false);

    const handleReset = () => {
        clearCart();
        setTableNumber('');
        setCustomerName('');
        setPhoneNumber('');
        setShowPaymentModal(false);
        setIsCartOpen(false);
        setPaystackAccessCode('');
        setIsGatewayLoading(false);
        setPendingOrderId(null); 
    };

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hooks
    // ============================================================================
    const { data: categories = [], isLoading: categoriesLoading } = usePOSCategories(venueId as string);
    const { data: items = [], isLoading: itemsLoading } = usePOSItems(venueId as string);
    
    const submitOrderMutation = useSubmitPOSOrder();

    // ⚡ LIFECYCLE: Hybrid Socket + Polling Receptor for POS
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval>;

        if (pendingOrderId) {
            socket.emit('join_order_room', pendingOrderId);

            const handleSuccess = () => {
                toast.success("Payment Confirmed!");
                handleReset(); 
            };

            const handleFailure = (data: { orderId: string, method: string, reason: string }) => {
                toast.error(`Customer Payment Failed: ${data.reason}`);
                setPendingOrderId(null); 
            };

            socket.on('payment_success', handleSuccess);
            socket.on('payment_failed', handleFailure);

            pollInterval = setInterval(async () => {
                try {
                    const res = await axios.get<OrderStatusResponse>(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${pendingOrderId}/status`,
                        { headers: { Authorization: `Bearer ${token}` } } 
                    );
                    const currentStatus = res.data.payment_status;

                    if (currentStatus === "PAID"){
                        handleSuccess();
                    } else if (currentStatus === 'FAILED' || res.data.status === 'CANCELLED' || res.data.status === 'cancelled'){
                        handleFailure({ orderId: pendingOrderId, method: 'POLL', reason: "Cancelled or Insufficient Funds" });
                    }
                } catch (error){
                    console.error("Polling error:", error);
                }
            }, 4000);

            return () => {
                socket.off('payment_success', handleSuccess);
                socket.off('payment_failed', handleFailure);
                clearInterval(pollInterval);
            };
        }
    }, [pendingOrderId, token]);

    const filteredItems = useMemo(() => {
        return items.filter((item: POSItem) => {
            const matchesCat = !activeCategoryId || activeCategoryId === 'all' || item.category_id === activeCategoryId;
            const itemName = item.name || '';
            const matchesSearch = itemName.toLowerCase().includes((searchQuery || '').toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [items, activeCategoryId, searchQuery]);

    const handleCheckout = (paymentMethod: 'CASH' | 'M-PESA' | 'CARD') => {
        const payload = {
            cartItems: Object.values(cart).map(item => ({
                item_id: item.item_id,
                quantity: item.quantity,
            })),
            paymentMethod,
            customerName,
            tableNumber,
            phoneNumber
        };

        submitOrderMutation.mutate(payload, {
            onSuccess: (data) => {
                if (data.status === 'success') {
                    toast.success('Order sent to kitchen!');
                    handleReset();
                } else if (data.status === 'mpesa_sent') {
                    toast.success('STK Push sent! Waiting for payment...');
                    setShowPaymentModal(false);
                    setPendingOrderId(data.orderId); 
                } else if (data.status === 'card_init') {
                    setIsGatewayLoading(true); 
                    setShowPaymentModal(false); 
                    setPaystackAccessCode(data.access_code);
                    setPendingOrderId(data.orderId); 
                }
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || 'Failed to submit order');
            }
        });
    };

    const cartItemsList = Object.values(cart);
    const isCartEmpty = cartItemsList.length === 0;
    const canCheckout = !isCartEmpty && tableNumber.trim() !== '';

    return (
        <div className="flex-1 w-full h-[calc(100dvh-4rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50 relative">
            
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCartOpen ? 'hidden md:flex' : 'flex'}`}>
                
                <header className="bg-white px-4 md:px-6 py-4 border-b border-slate-200 shrink-0 shadow-sm z-10 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100/50 border border-slate-200 rounded-full pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                    </div>
                </header>

                <div className="bg-white px-4 md:px-6 py-3 border-b border-slate-200 shrink-0">
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${!activeCategoryId || activeCategoryId === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            All Items
                        </button>
                        {categories.map((cat: POSCategory) => (
                            <button
                                key={cat.category_id}
                                onClick={() => setActiveCategory(cat.category_id)}
                                className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeCategoryId === cat.category_id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 custom-scrollbar relative">
                    {itemsLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ChefHat size={48} className="mb-4 opacity-50" />
                            <p className="font-bold">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-24 md:pb-6">
                            {filteredItems.map((item: POSItem) => {
                                const qty = cart[item.item_id]?.quantity || 0;
                                return (
                                    <div 
                                        key={item.item_id} 
                                        onClick={() => addToCart({ ...item, price: Number(item.price) })}
                                        className="bg-white rounded-2xl border border-slate-200 p-2 md:p-3 flex flex-col gap-2 md:gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group relative"
                                    >
                                        {qty > 0 && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-sm shadow-md border-2 border-white z-10">
                                                {qty}
                                            </div>
                                        )}
                                        <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-slate-100">
                                            {item.image_url ? (
                                                <img src={getImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e:any)=>{e.target.style.display='none'}}/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <ChefHat size={24}/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                            <span className="font-black text-indigo-600 text-sm md:text-base mt-auto">
                                                {Number(item.price).toLocaleString('en-KE')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isCartOpen && !isCartEmpty && (
                        <div className="md:hidden fixed bottom-6 left-4 right-4 z-20 animate-in slide-in-from-bottom-10">
                            <button 
                                onClick={() => setIsCartOpen(true)}
                                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-lg flex items-center justify-between shadow-2xl active:scale-[0.98] transition-transform"
                            >
                                <span className="flex items-center gap-2">
                                    <ShoppingCart size={20}/> 
                                    View Ticket ({cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0)})
                                </span>
                                <span>{getCartTotal().toLocaleString('en-KE')}</span>
                            </button>
                        </div>
                    )}
                </main>
            </div>

            <div className={`w-full md:w-96 bg-white md:border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none z-50 transition-transform duration-300 absolute md:relative right-0 h-full ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                
                <header className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
                            <ArrowLeft size={20}/>
                        </button>
                        <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
                            Ticket
                        </h2>
                    </div>
                    
                    {cartItemsList.length > 0 && (
                        <button onClick={clearCart} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold">
                            <Trash2 size={16} /> <span className="hidden md:inline">Clear</span>
                        </button>
                    )}
                </header>

                <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Table Number (Required)" 
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className={`w-full pl-9 pr-4 py-3 bg-slate-50 border rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${!tableNumber && !isCartEmpty ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200'}`}
                        />
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Customer Name (Optional)" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {isCartEmpty ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center bg-slate-50">
                                <ShoppingCart size={32} className="text-slate-300"/>
                            </div>
                            <p className="font-bold text-sm">Ticket is empty</p>
                        </div>
                    ) : (
                        cartItemsList.map(item => (
                            <div key={item.item_id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                                    <span className="font-black text-indigo-600 text-xs">{(item.price * item.quantity).toLocaleString()} KES</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                    <button onClick={() => updateQuantity(item.item_id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 active:scale-95"><Minus size={16}/></button>
                                    <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.item_id, 1)} className="w-8 h-8 flex items-center justify-center bg-indigo-600 rounded-lg shadow-sm text-white active:scale-95"><Plus size={16}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-4 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)] pb-6 md:pb-4">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-slate-500 font-bold text-sm">Total</span>
                        <span className="font-black text-3xl text-slate-900">{getCartTotal().toLocaleString('en-KE')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            disabled={!canCheckout || submitOrderMutation.isPending}
                            onClick={() => handleCheckout('CASH')}
                            className="flex flex-col items-center justify-center gap-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md"
                        >
                            <Banknote size={24} />
                            <span className="text-sm">Cash</span>
                        </button>
                        
                        <button 
                            disabled={!canCheckout || submitOrderMutation.isPending}
                            onClick={() => setShowPaymentModal(true)}
                            className="flex flex-col items-center justify-center gap-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                        >
                            <MonitorSmartphone size={24} />
                            <span className="text-sm">Digital Pay</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:px-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="relative w-full md:max-w-sm bg-white md:rounded-[2rem] rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                            <MonitorSmartphone size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-center text-slate-900 mb-2">Checkout Options</h3>
                        <p className="text-center text-sm text-slate-500 mb-6">Total Amount: <span className="font-bold text-slate-800">{getCartTotal().toLocaleString()} KES</span></p>
                        
                        <div className="space-y-3 pb-6 md:pb-0">
                            <button 
                                disabled={submitOrderMutation.isPending}
                                onClick={() => handleCheckout('CARD')}
                                className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-2xl active:scale-95 disabled:opacity-50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <CreditCard size={24} className="text-indigo-600"/>
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-base">Bank Card</span>
                                        <span className="text-xs text-indigo-500 font-bold">Generate payment link</span>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                            </button>

                            <div className="relative flex py-4 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">OR M-PESA</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <input 
                                type="tel" 
                                placeholder="Customer M-Pesa (07XX...)" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full text-center text-xl tracking-widest font-black py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#52B44B] outline-none transition-all"
                            />
                            
                            <button 
                                disabled={submitOrderMutation.isPending || phoneNumber.length < 9}
                                onClick={() => handleCheckout('M-PESA')}
                                className="w-full flex justify-center items-center gap-2 py-4 bg-[#52B44B] hover:bg-[#459a3f] text-white font-black text-lg rounded-2xl active:scale-95 disabled:opacity-50 transition-all shadow-md mt-2"
                            >
                                {submitOrderMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <><Smartphone size={24}/> Send STK Push</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ⚡ OPTIMISTIC UI: The Blocking Gateway Overlay */}
            {isGatewayLoading && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    <Loader2 size={48} className="animate-spin mb-4 text-indigo-400" />
                    <h3 className="text-xl font-black tracking-wide">Connecting to Gateway...</h3>
                    <p className="text-slate-300 text-sm mt-2 font-medium">Secured by Paystack</p>
                </div>
            )}

            {/* ⚡ SYNCHRONOUS CLEANSING: State is wiped the millisecond a callback fires */}
            {paystackAccessCode && (
                <NativePaystackLauncher 
                    accessCode={paystackAccessCode}
                    onSuccess={() => {
                        setPaystackAccessCode(''); // Sever the access code
                        setIsGatewayLoading(false); // Drop the overlay
                        toast.success("Authorizing payment...");
                    }}
                    onClose={() => {
                        setPaystackAccessCode(''); // Sever the access code
                        setIsGatewayLoading(false); // Drop the overlay
                        setPendingOrderId(null); // Clear the pending order so POS can try again
                        toast.error("Payment window closed.");
                    }}
                />
            )}
        </div>
    );
}