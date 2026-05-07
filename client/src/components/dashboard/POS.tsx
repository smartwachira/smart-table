import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { usePaystackPayment } from 'react-paystack'; 
import { 
    Search, ShoppingCart, Plus, Minus, Trash2,Loader2, 
    Smartphone, Banknote, ChefHat, User, Hash, X, MonitorSmartphone, ChevronRight, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore'; 
import { useMenuStore } from '../../store/useMenuStore'; 

// 🛡️ Strict Typings
export interface POSCategory {
    category_id: string;
    name: string;
    is_active?: boolean;
}

export interface POSItem {
    item_id: string;
    name: string;
    price: number | string;
    category_id: string;
    image_url?: string;
    is_available?: boolean;
}

type PaymentMethodType = 'CASH' | 'M-PESA' | 'CARD';

// Defines all possible return shapes from our mutation
type SubmitOrderResponse = 
    | { status: 'success' }
    | { status: 'mpesa_sent' }
    | { status: 'card_init'; reference: string };

const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; 
    const sanitizedPath = path.replace(/\\/g, '/');
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cleanPath}`;
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

    // ⚡ PAYSTACK STATE FIX
    const [paystackReference, setPaystackReference] = useState<string>('');

    const initializePaystack = usePaystackPayment({
        reference: paystackReference,
        email: "pos@smarttable.com", 
        amount: Math.round(getCartTotal() * 100), 
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    });

    const handleReset = () => {
        clearCart();
        setTableNumber('');
        setCustomerName('');
        setPhoneNumber('');
        setShowPaymentModal(false);
        setIsCartOpen(false);
        setPaystackReference('');
    };

    // ⚡ LIFECYCLE: Watch for reference update to safely pop modal
    useEffect(() => {
        if (paystackReference && showPaymentModal) {
            setShowPaymentModal(false); // Hide internal modal
            
            (initializePaystack as Function)(
                (ref: any) => { 
                    toast.success("Card Payment Successful!");
                    handleReset();
                },
                () => { 
                    toast.error("Payment window closed. Order is still pending.");
                    setPaystackReference('');
                }
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paystackReference]);

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories', venueId],
        queryFn: async () => {
            const res = await axios.get<POSCategory[]>(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/menu/categories/venue/${venueId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data.filter(c => c.is_active !== false);
        },
        enabled: !!venueId && !!token
    });

    const { data: items = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['menuItems', venueId],
        queryFn: async () => {
            const res = await axios.get<POSItem[]>(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/menu/items/venue/${venueId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data.filter(i => i.is_available !== false);
        },
        enabled: !!venueId && !!token
    });

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesCat = activeCategoryId === 'all' || item.category_id === activeCategoryId;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [items, activeCategoryId, searchQuery]);

    // 🛡️ Explicitly typed mutation: <ReturnData, ErrorType, VariablesType>
    const submitOrderMutation = useMutation<SubmitOrderResponse, AxiosError<{ message: string }>, PaymentMethodType>({
        mutationFn: async (paymentMethod) => {
            const payload = {
                items: Object.values(cart).map(item => ({
                    item_id: item.item_id,
                    quantity: item.quantity,
                })),
                payment_method: paymentMethod,
                customer_name: customerName,
                table_number: tableNumber,
                phone_number: paymentMethod === 'M-PESA' ? phoneNumber : undefined,
            };

            const orderRes = await axios.post<{ orderId: string }>(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders`, 
                payload, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const orderId = orderRes.data.orderId;

            if (paymentMethod === 'M-PESA') {
                await axios.post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/mpesa/stkpush`,
                    { orderId, phone: phoneNumber },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                return { status: 'mpesa_sent' };
            }

            if (paymentMethod === 'CARD') {
                const initRes = await axios.post<{ reference: string }>(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/paystack/initialize`,
                    { orderId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                return { status: 'card_init', reference: initRes.data.reference };
            }

            return { status: 'success' };
        },
        onSuccess: (data) => {
            if (data.status === 'success') {
                toast.success('Order sent to kitchen!');
                handleReset();
            } else if (data.status === 'mpesa_sent') {
                toast.success('STK Push sent to customer!');
                handleReset();
            } else if (data.status === 'card_init') {
                toast.loading("Opening Gateway...", { id: 'pos-gateway' });
                // Triggers the useEffect
                setPaystackReference(data.reference);
                setTimeout(() => toast.dismiss('pos-gateway'), 500); 
            }
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to submit order');
        }
    });

    const cartItemsList = Object.values(cart);
    const isCartEmpty = cartItemsList.length === 0;
    const canCheckout = !isCartEmpty && tableNumber.trim() !== '';

    return (
        <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50 -m-6 md:-m-8">
            
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCartOpen ? 'hidden md:flex' : 'flex'}`}>
                
                <header className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-4 max-w-4xl">
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
                    </div>
                </header>

                <div className="bg-white px-6 py-3 border-b border-slate-200 shrink-0">
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeCategoryId === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            All Items
                        </button>
                        {categories.map(cat => (
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

                <main className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    {itemsLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ChefHat size={48} className="mb-4 opacity-50" />
                            <p className="font-bold">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-6">
                            {filteredItems.map(item => {
                                const qty = cart[item.item_id]?.quantity || 0;
                                return (
                                    <div 
                                        key={item.item_id} 
                                        onClick={() => addToCart({ ...item, price: Number(item.price) })}
                                        className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group relative"
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
                                            <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                            <span className="font-black text-indigo-600 text-base mt-auto">
                                                {Number(item.price).toLocaleString('en-KE')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                {!isCartOpen && !isCartEmpty && (
                    <div className="md:hidden absolute bottom-6 left-6 right-6">
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-lg flex items-center justify-between shadow-xl"
                        >
                            <span className="flex items-center gap-2"><ShoppingCart size={20}/> View Order ({cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0)})</span>
                            <span>{getCartTotal().toLocaleString('en-KE')}</span>
                        </button>
                    </div>
                )}
            </div>

            <div className={`w-full md:w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none z-20 transition-transform duration-300 absolute md:relative right-0 h-full ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                
                <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
                        Current Order
                    </h2>
                    <div className="flex items-center gap-2">
                        {cartItemsList.length > 0 && (
                            <button onClick={clearCart} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear Order">
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 text-slate-500 bg-slate-100 rounded-full">
                            <X size={20}/>
                        </button>
                    </div>
                </header>

                <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Table Number (Required)" 
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${!tableNumber && !isCartEmpty ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200'}`}
                        />
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Customer Name (Optional)" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {isCartEmpty ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center">
                                <ShoppingCart size={32} className="text-slate-300"/>
                            </div>
                            <p className="font-bold text-sm">Order is empty</p>
                        </div>
                    ) : (
                        cartItemsList.map(item => (
                            <div key={item.item_id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                                    <span className="font-black text-indigo-600 text-xs">{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                    <button onClick={() => updateQuantity(item.item_id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 active:scale-95"><Minus size={14}/></button>
                                    <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.item_id, 1)} className="w-8 h-8 flex items-center justify-center bg-indigo-600 rounded shadow-sm text-white active:scale-95"><Plus size={14}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-4 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end">
                        <span className="text-slate-500 font-bold text-sm">Order Total</span>
                        <span className="font-black text-3xl text-slate-900">{getCartTotal().toLocaleString('en-KE')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            disabled={!canCheckout || submitOrderMutation.isPending}
                            onClick={() => submitOrderMutation.mutate('CASH')}
                            className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md"
                        >
                            <Banknote size={20} />
                            <span className="text-xs">Cash</span>
                        </button>
                        
                        <button 
                            disabled={!canCheckout || submitOrderMutation.isPending}
                            onClick={() => setShowPaymentModal(true)}
                            className="flex flex-col items-center justify-center gap-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                        >
                            <MonitorSmartphone size={20} />
                            <span className="text-xs">Digital Pay</span>
                        </button>
                    </div>
                </div>
            </div>

            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MonitorSmartphone size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-center text-slate-900 mb-2">Digital Payment</h3>
                        <p className="text-center text-sm text-slate-500 mb-6">Total Amount: <span className="font-bold text-slate-800">{getCartTotal().toLocaleString()} KES</span></p>
                        
                        <div className="space-y-3">
                            <button 
                                disabled={submitOrderMutation.isPending}
                                onClick={() => submitOrderMutation.mutate('CARD')}
                                className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-2xl active:scale-95 disabled:opacity-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <CreditCard size={20} className="text-indigo-600"/>
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold">Bank Card (PDQ bypass)</span>
                                        <span className="text-xs text-indigo-500 font-medium">Customer enters card on device</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">OR M-PESA</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <input 
                                type="tel" 
                                placeholder="Customer M-Pesa (07XX...)" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full text-center text-lg font-bold py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#52B44B] outline-none"
                            />
                            
                            <button 
                                disabled={submitOrderMutation.isPending || phoneNumber.length < 9}
                                onClick={() => submitOrderMutation.mutate('M-PESA')}
                                className="w-full flex justify-center items-center gap-2 py-4 bg-[#52B44B] hover:bg-[#459a3f] text-white font-black rounded-xl active:scale-95 disabled:opacity-50 transition-all shadow-md"
                            >
                                {submitOrderMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <><Smartphone size={20}/> Send STK Push</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}