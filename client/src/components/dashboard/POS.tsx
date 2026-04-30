import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { 
    Search, ShoppingCart, Plus, Minus, Trash2,Loader2, 
    Smartphone, Banknote, ChefHat, User, Hash, X, MonitorSmartphone, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore'; // ⚡ Global Cart State
import { useMenuStore } from '../../store/useMenuStore'; // ⚡ Global Menu UI State

// 🛡️ Explicit Interfaces for POS Data Models
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

// ⚡ HELPER: Bulletproof Image Pathing
const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; 
    const sanitizedPath = path.replace(/\\/g, '/');
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `http://localhost:5000${cleanPath}`;
};

export default function POS() {
    const { user } = useAuth();
    const token = localStorage.getItem('auth_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // ============================================================================
    // ⚡ ZUSTAND GLOBAL STATE: Survives all route changes and unmounting!
    // ============================================================================
    const { activeCategoryId, searchQuery, setActiveCategory, setSearchQuery } = useMenuStore();
    const { 
        items: cartItems, 
        activeTable, 
        setActiveTable, 
        addItem, 
        updateQuantity, 
        removeItem, 
        clearCart, 
        getCartTotal, 
        getItemCount 
    } = useCartStore();

    // Local UI State
    const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false); 
    const [customerName, setCustomerName] = useState<string>(''); // Can be moved to Zustand if needed
    const [mpesaModalOpen, setMpesaModalOpen] = useState<boolean>(false);
    const [phoneNumber, setPhoneNumber] = useState<string>('');

    // ============================================================================
    // ⚡ TANSTACK QUERY: Smart Server Caching (Replaces manual useEffect)
    // ============================================================================
    const { data: items = [], isLoading: isItemsLoading } = useQuery({
        queryKey: ['posItems', user?.venueId],
        queryFn: async () => {
            const res = await axios.get<{ items?: POSItem[] } | POSItem[]>('/api/menu/items', config);
            const fetchedItems = Array.isArray(res.data) ? res.data : res.data.items || [];
            return fetchedItems.filter(i => i.is_available !== false); // Only available items
        },
        enabled: !!user?.venueId
    });

    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
        queryKey: ['posCategories', user?.venueId],
        queryFn: async () => {
            const res = await axios.get<{ categories?: POSCategory[] } | POSCategory[]>('/api/menu/categories', config);
            const fetchedCategories = Array.isArray(res.data) ? res.data : res.data.categories || [];
            return fetchedCategories.filter(c => c.is_active !== false); // Only active categories
        },
        enabled: !!user?.venueId
    });

    // ============================================================================
    // ⚡ TANSTACK MUTATION: Transaction Handling
    // ============================================================================
    const submitOrderMutation = useMutation({
        mutationFn: async (paymentMethod: 'CASH' | 'M-PESA') => {
            if (cartItems.length === 0) throw new Error("Cart is empty");
            if (!activeTable?.trim()) throw new Error("Please enter a Table/Tab identifier");
            if (paymentMethod === 'M-PESA' && (phoneNumber.length < 9 || phoneNumber.length > 12)) {
                throw new Error("Valid phone number required for M-Pesa");
            }

            const orderPayload = {
                table_number: activeTable,
                customer_name: customerName || 'Walk-in',
                payment_method: paymentMethod,
                phone_number: paymentMethod === 'M-PESA' ? phoneNumber : null,
                items: cartItems.map(i => ({ item_id: i.item_id, quantity: i.quantity }))
            };

            const orderRes = await axios.post<{ orderId: string }>('/api/orders', orderPayload, config);

            // Trigger STK Push sequentially if M-PESA is selected
            if (paymentMethod === 'M-PESA') {
                await axios.post('/api/mpesa/stkpush', { 
                    orderId: orderRes.data.orderId, 
                    phone: phoneNumber 
                }, config);
                return { type: 'M-PESA' };
            }
            return { type: 'CASH' };
        },
        onSuccess: (data) => {
            if (data.type === 'M-PESA') {
                toast.success("M-Pesa prompt sent to customer!");
                setMpesaModalOpen(false);
                setPhoneNumber('');
            } else {
                toast.success("Order sent to kitchen!");
            }
            // Clear global and local state on success
            clearCart();
            setCustomerName('');
            setIsMobileCartOpen(false);
        },
        onError: (error: any) => {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || error.message || "Failed to submit order");
        }
    });

    // ============================================================================
    // HANDLERS & DERIVED STATE
    // ============================================================================
    const handleClearCart = () => {
        if (window.confirm('Are you sure you want to clear the current cart?')) {
            clearCart();
            setCustomerName('');
            setIsMobileCartOpen(false);
        }
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesCat = activeCategoryId === 'all' || item.category_id === activeCategoryId;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [items, activeCategoryId, searchQuery]);

    if (isItemsLoading || isCategoriesLoading) {
        return (
            <div className="flex h-[calc(100dvh-80px)] items-center justify-center bg-slate-50 text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <MonitorSmartphone size={48} className="mb-4 text-indigo-300" />
                    <p className="font-bold">Loading POS Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100dvh-80px)] lg:h-[calc(100vh-80px)] flex bg-slate-100 overflow-hidden relative animate-in fade-in duration-300">
            
            {/* =========================================
                LEFT SIDE: MENU GRID
            ========================================= */}
            <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
                
                <div className="bg-white p-3 md:p-4 border-b border-slate-200 shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-4 mb-3 md:mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search menu items..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-shadow text-sm md:text-base"
                            />
                        </div>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                        <button 
                            onClick={() => setActiveCategory('all')} 
                            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shrink-0 transition-colors ${activeCategoryId === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.category_id} 
                                onClick={() => setActiveCategory(cat.category_id)}
                                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shrink-0 transition-colors ${activeCategoryId === cat.category_id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar bg-slate-50/50">
                    {filteredItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ChefHat size={48} className="mb-4 opacity-30" />
                            <p className="font-bold">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-28 lg:pb-4">
                            {filteredItems.map(item => (
                                <button 
                                    key={item.item_id}
                                    onClick={() => addItem(item as any)} // Ensure types align with CartItem
                                    className="bg-white p-2.5 md:p-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col active:scale-95 group"
                                >
                                    <div className="w-full aspect-video bg-slate-100 rounded-xl mb-2.5 overflow-hidden relative">
                                        {item.image_url ? (
                                            <img src={getImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e:any)=>{e.target.style.display='none'}}/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><ChefHat size={24}/></div>
                                        )}
                                        <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                            <Plus size={32} className="text-indigo-700 bg-white rounded-full p-1 shadow-lg" />
                                        </div>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-xs md:text-sm leading-tight mb-1 line-clamp-2">{item.name}</h4>
                                    <span className="font-bold text-indigo-600 text-[11px] md:text-xs mt-auto">
                                        {Number(item.price).toLocaleString('en-KE')} KES
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* =========================================
                MOBILE FLOATING ACTION BUTTON (FAB)
            ========================================= */}
            {!isMobileCartOpen && cartItems.length > 0 && (
                <div className="lg:hidden absolute bottom-4 left-4 right-4 z-30 animate-in slide-in-from-bottom-4">
                    <button 
                        onClick={() => setIsMobileCartOpen(true)}
                        className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center active:scale-95 transition-transform border border-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2.5 rounded-xl relative">
                                <ShoppingCart size={20} />
                                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm border-2 border-slate-900">
                                    {getItemCount()}
                                </span>
                            </div>
                            <div className="text-left">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Order</span>
                                <span className="block font-black text-sm">{cartItems.length} items</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black">{getCartTotal().toLocaleString()} <span className="text-xs text-slate-400">KES</span></span>
                            <ChevronRight size={20} className="text-slate-500" />
                        </div>
                    </button>
                </div>
            )}

            {/* =========================================
                RIGHT SIDE: POS CART (Powered by Zustand)
            ========================================= */}
            {isMobileCartOpen && (
                <div 
                    className="lg:hidden absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setIsMobileCartOpen(false)}
                />
            )}

            <div className={`
                absolute inset-y-0 right-0 z-50 w-[90%] max-w-[400px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
                lg:static lg:w-[400px] lg:border-l lg:border-slate-200 lg:translate-x-0 lg:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]
                ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 -ml-2 bg-slate-200 text-slate-600 rounded-xl active:bg-slate-300 transition-colors">
                            <X size={20} />
                        </button>
                        <ShoppingCart className="text-indigo-600 hidden lg:block" size={20} />
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Checkout</h2>
                    </div>
                    {cartItems.length > 0 && (
                        <button onClick={handleClearCart} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 px-2.5 py-1.5 rounded-lg active:scale-95">
                            <Trash2 size={14} /> Clear
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart size={48} className="mb-4 opacity-20"/>
                            <p className="font-bold text-sm">Cart is empty</p>
                            <p className="text-xs mt-1">Tap items to add them.</p>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.cart_id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-right-4 duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{item.name}</h4>
                                        <p className="font-bold text-indigo-600 text-xs mt-0.5">{(Number(item.price) * item.quantity).toLocaleString()} KES</p>
                                    </div>
                                    <button 
                                        onClick={() => removeItem(item.cart_id)} 
                                        className="text-slate-300 hover:text-red-500 bg-white rounded-full p-1 transition-colors border border-transparent hover:border-red-100 shadow-sm"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-end mt-1">
                                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
                                        <button onClick={() => updateQuantity(item.cart_id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded active:scale-95 transition-colors"><Minus size={16}/></button>
                                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cart_id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded active:scale-95 transition-colors"><Plus size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ticket Footer / Checkout */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-4 pb-safe">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="text" 
                                placeholder="Table/Tab *" 
                                value={activeTable || ''}
                                onChange={(e) => setActiveTable(e.target.value)}
                                className="w-full pl-9 pr-3 py-3 lg:py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase shadow-inner"
                            />
                        </div>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="text" 
                                placeholder="Customer" 
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full pl-9 pr-3 py-3 lg:py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                        <span className="text-sm font-bold text-slate-500">Total Due</span>
                        <span className="text-2xl lg:text-3xl font-black text-slate-900">{getCartTotal().toLocaleString()} <span className="text-sm lg:text-lg">KES</span></span>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <button 
                            disabled={submitOrderMutation.isPending || cartItems.length === 0}
                            onClick={() => submitOrderMutation.mutate('CASH')}
                            className="w-full flex items-center justify-center gap-2 py-4 lg:py-3.5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl active:scale-95 disabled:opacity-50 transition-all shadow-md"
                        >
                            {submitOrderMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18}/>}
                            Process Cash Order
                        </button>
                        <button 
                            disabled={submitOrderMutation.isPending || cartItems.length === 0}
                            onClick={() => setMpesaModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-4 lg:py-3.5 bg-[#52B44B] hover:bg-[#459a3f] text-white text-sm font-bold rounded-xl active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#52B44B]/30"
                        >
                            <Smartphone size={18}/> STK Push to Phone
                        </button>
                    </div>
                </div>
            </div>

            {/* M-PESA MODAL */}
            {mpesaModalOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMpesaModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setMpesaModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                        
                        <div className="w-16 h-16 bg-[#52B44B]/10 text-[#52B44B] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone size={32} />
                        </div>
                        <h2 className="text-xl font-black text-center text-slate-900 mb-2">Initiate M-Pesa Push</h2>
                        <p className="text-center text-sm text-slate-500 mb-6">Enter customer's phone number to send an STK push for <span className="font-bold text-slate-800">{getCartTotal().toLocaleString()} KES</span>.</p>
                        
                        <input 
                            type="tel" 
                            placeholder="07XX XXX XXX" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full text-center text-xl tracking-widest font-black py-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-[#52B44B] outline-none shadow-inner"
                        />
                        
                        <button 
                            disabled={submitOrderMutation.isPending || phoneNumber.length < 9}
                            onClick={() => submitOrderMutation.mutate('M-PESA')}
                            className="w-full flex justify-center py-4 bg-[#52B44B] hover:bg-[#459a3f] text-white font-black rounded-xl active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-[#52B44B]/30"
                        >
                            {submitOrderMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : 'Send Prompt to Phone'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
