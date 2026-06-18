import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { 
    Search, ShoppingCart, Plus, Minus, Trash2, Loader2, 
    Banknote, ChefHat, User, Hash, X, MonitorSmartphone, CreditCard, ArrowLeft, Lock, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore'; 
import { useMenuStore } from '../../store/useMenuStore'; 

import { usePOSCategories, usePOSItems, useSubmitPOSOrder, POSCategory, POSItem, getImageUrl } from '../../hooks/usePOS';
import { useLiveOrders, useSettleTab } from '../../hooks/useLiveOrders'; 
import { useFetchSettings } from '../../hooks/useSettings'; 

// ⚡ SPRINT 22: IMPORT THE UNIVERSAL ENGINE
import SmartPaymentEngine from '../shared/SmartPaymentEngine'; 

export default function POS() {
    const { venueId } = useAuth();
    const { cart, addToCart, updateQuantity, clearCart, getCartTotal } = useCartStore();
    const { searchQuery, activeCategoryId, setSearchQuery, setActiveCategory } = useMenuStore();
    
    const [tableNumber, setTableNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isTabsModalOpen, setIsTabsModalOpen] = useState(false);

    // ⚡ SPRINT 22: Universal Engine State
    const [isEngineOpen, setIsEngineOpen] = useState(false);
    const [engineOrderIds, setEngineOrderIds] = useState<string[]>([]);
    const [engineAmount, setEngineAmount] = useState<number>(0);

    const handleReset = () => {
        clearCart();
        setTableNumber('');
        setCustomerName('');
        setIsCartOpen(false);
    };

    const { data: categories = [], isLoading: categoriesLoading } = usePOSCategories(venueId as string);
    const { data: items = [], isLoading: itemsLoading } = usePOSItems(venueId as string);
    const { data: liveOrders = [] } = useLiveOrders(venueId as string);
    const { data: venueSettings } = useFetchSettings(venueId as string); 
    
    const submitOrderMutation = useSubmitPOSOrder();
    const settleTabMutation = useSettleTab();

    const isTabAllowed = 
        (venueSettings as any)?.tab_operating_mode === 'ENABLED_ALL' || 
        ((venueSettings as any)?.tab_operating_mode === 'VIP_ONLY' && 
         Array.isArray((venueSettings as any)?.vip_tables) && 
         (venueSettings as any).vip_tables.map((t: string) => t.toLowerCase()).includes(tableNumber.toLowerCase().trim()));

    const activeTabs = useMemo(() => {
        const tabs: Record<string, { table_number: string, total: number, order_count: number }> = {};
        liveOrders.forEach(order => {
            if (order.payment_method === 'TAB' && order.payment_status === 'PENDING' && order.status !== 'CANCELLED') {

                const tName = String(order.table_number).toUpperCase().trim()

                if (!tabs[tName]) {
                    tabs[tName] = { table_number: order.table_number, total: 0, order_count: 0 };
                }
                tabs[tName].total += Number(order.total_amount);
                tabs[tName].order_count += 1;
            }
        });
        return Object.values(tabs).sort((a, b) => b.total - a.total); 
    }, [liveOrders]);

    const filteredItems = useMemo(() => {
        return items.filter((item: POSItem) => {
            const matchesCat = !activeCategoryId || activeCategoryId === 'all' || item.category_id === activeCategoryId;
            const itemName = item.name || '';
            const matchesSearch = itemName.toLowerCase().includes((searchQuery || '').toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [items, activeCategoryId, searchQuery]);

    // ⚡ SPRINT 22: Decoupled Checkout Logic
    const handleCheckout = (paymentMethod: 'CASH' | 'CARD' | 'TAB') => {
        const payload = {
            cartItems: Object.values(cart).map(item => ({ item_id: item.item_id, quantity: item.quantity })),
            paymentMethod,
            customerName,
            tableNumber,
        };

        submitOrderMutation.mutate(payload as any, {
            onSuccess: (data) => {
                if (paymentMethod === 'CARD') {
                    // Trigger Universal Engine Handover
                    setEngineOrderIds([data.orderId as string]);
                    setEngineAmount(getCartTotal());
                    setIsEngineOpen(true);
                    setIsCartOpen(false); // Close cart drawer to focus on payment modal
                } else {
                    toast.success(paymentMethod === 'TAB' ? 'Added to Open Tab!' : 'Order sent to kitchen!');
                    handleReset();
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
            
            {/* MAIN POS VIEW */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCartOpen ? 'hidden md:flex' : 'flex'}`}>
                <header className="bg-white px-4 md:px-6 py-4 border-b border-slate-200 shrink-0 shadow-sm z-10 flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" placeholder="Search menu items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100/50 border border-slate-200 rounded-full pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"/>
                    </div>
                    <button onClick={() => setIsTabsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black rounded-xl transition-all shadow-sm border border-purple-100 active:scale-95">
                        <Lock size={18} /><span className="hidden sm:inline tracking-wide">Active Tabs</span>
                        {activeTabs.length > 0 && <span className="bg-purple-600 text-white text-[11px] px-2 py-0.5 rounded-md ml-1 shadow-sm">{activeTabs.length}</span>}
                    </button>
                </header>

                <div className="bg-white px-4 md:px-6 py-3 border-b border-slate-200 shrink-0">
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                        <button onClick={() => setActiveCategory('all')} className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${!activeCategoryId || activeCategoryId === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All Items</button>
                        {categories.map((cat: POSCategory) => (
                            <button key={cat.category_id} onClick={() => setActiveCategory(cat.category_id)} className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeCategoryId === cat.category_id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat.name}</button>
                        ))}
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 custom-scrollbar relative">
                    {itemsLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400"><ChefHat size={48} className="mb-4 opacity-50" /><p className="font-bold">No items found</p></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-24 md:pb-6">
                            {filteredItems.map((item: POSItem) => {
                                const qty = cart[item.item_id]?.quantity || 0;
                                return (
                                    <div key={item.item_id} onClick={() => addToCart({ ...item, price: Number(item.price) })} className="bg-white rounded-2xl border border-slate-200 p-2 md:p-3 flex flex-col gap-2 md:gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group relative">
                                        {qty > 0 && <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-sm shadow-md border-2 border-white z-10">{qty}</div>}
                                        <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-slate-100">
                                            {item.image_url ? <img src={getImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e:any)=>{e.target.style.display='none'}}/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ChefHat size={24}/></div>}
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                            <span className="font-black text-indigo-600 text-sm md:text-base mt-auto">{Number(item.price).toLocaleString('en-KE')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isCartOpen && !isCartEmpty && (
                        <div className="md:hidden fixed bottom-6 left-4 right-4 z-20 animate-in slide-in-from-bottom-10">
                            <button onClick={() => setIsCartOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-lg flex items-center justify-between shadow-2xl active:scale-[0.98] transition-transform">
                                <span className="flex items-center gap-2"><ShoppingCart size={20}/> View Ticket ({cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0)})</span>
                                <span>{getCartTotal().toLocaleString('en-KE')}</span>
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* CART DRAWER */}
            <div className={`w-full md:w-[400px] bg-white md:border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none z-50 transition-transform duration-300 absolute md:relative right-0 h-full ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                <header className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                        <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">Ticket</h2>
                    </div>
                    {cartItemsList.length > 0 && <button onClick={clearCart} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"><Trash2 size={16} /> <span className="hidden md:inline">Clear</span></button>}
                </header>

                <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Table Number (Required)" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className={`w-full pl-9 pr-4 py-3 bg-slate-50 border rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${!tableNumber && !isCartEmpty ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200'}`} />
                    </div>
                    
                    {/* VIP Table Quick-Select Pills */}
                    {(venueSettings as any)?.tab_operating_mode === 'VIP_ONLY' && Array.isArray((venueSettings as any)?.vip_tables) && (venueSettings as any).vip_tables.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {(venueSettings as any).vip_tables.map((vt: string) => (
                                <button key={vt} onClick={() => setTableNumber(vt)} className={`shrink-0 px-3 py-1.5 text-xs font-black rounded-lg transition-colors ${tableNumber.toLowerCase() === vt.toLowerCase() ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100'}`}>{vt}</button>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Customer Name (Optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"/>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {isCartEmpty ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center bg-slate-50"><ShoppingCart size={32} className="text-slate-300"/></div>
                            <p className="font-bold text-sm">Ticket is empty</p>
                        </div>
                    ) : (
                        cartItemsList.map(item => (
                            <div key={item.item_id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
                                <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4><span className="font-black text-indigo-600 text-xs">{(item.price * item.quantity).toLocaleString()} KES</span></div>
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
                        <span className="text-slate-500 font-bold text-sm">Total</span><span className="font-black text-3xl text-slate-900">{getCartTotal().toLocaleString('en-KE')}</span>
                    </div>
                    <div className={`grid ${isTabAllowed ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                        {isTabAllowed && <button disabled={!canCheckout || submitOrderMutation.isPending} onClick={() => handleCheckout('TAB')} className="flex flex-col items-center justify-center gap-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-purple-600/20"><Lock size={22} /><span className="text-xs">Add Tab</span></button>}
                        <button disabled={!canCheckout || submitOrderMutation.isPending} onClick={() => handleCheckout('CASH')} className="flex flex-col items-center justify-center gap-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md"><Banknote size={22} /><span className="text-xs">Cash</span></button>
                        <button disabled={!canCheckout || submitOrderMutation.isPending} onClick={() => handleCheckout('CARD')} className="flex flex-col items-center justify-center gap-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"><MonitorSmartphone size={22} /><span className="text-xs">Digital Pay</span></button>
                    </div>
                </div>
            </div>

            {/* CASHIER ACTIVE TABS MODAL */}
            {isTabsModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsTabsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-3xl rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
                        <button onClick={() => setIsTabsModalOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><X size={20} /></button>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0"><Lock className="text-purple-600" size={24} /></div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Active Open Tabs</h2>
                                <p className="text-sm font-medium text-slate-500">Select a table to settle their accumulated bill.</p>
                            </div>
                        </div>
                        {activeTabs.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-800">All tabs settled!</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
                                {activeTabs.map(tab => (
                                    <div key={tab.table_number} className="bg-white border-2 border-slate-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:border-purple-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                                            <div>
                                                <h3 className="font-black text-xl text-slate-900 uppercase tracking-widest">{tab.table_number}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-md">{tab.order_count} pending orders</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Total Due</div>
                                                <div className="font-black text-2xl text-purple-600 leading-none">{tab.total.toLocaleString('en-KE')}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { if(window.confirm(`Settle ${tab.table_number}'s tab via CASH?`)) settleTabMutation.mutate({ table_number: tab.table_number, settlement_method: 'CASH' }); }} disabled={settleTabMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50">
                                                <Banknote size={16} /> Cash
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    // ⚡ SPRINT 22: Engine Handover
                                                    const tableOrders = liveOrders.filter(o => o.table_number === tab.table_number && o.payment_method === 'TAB' && o.payment_status === 'PENDING');
                                                    setEngineOrderIds(tableOrders.map(o => o.order_id));
                                                    setEngineAmount(tab.total);
                                                    setIsEngineOpen(true);
                                                    setIsTabsModalOpen(false);
                                                }}
                                                disabled={settleTabMutation.isPending} 
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50"
                                            >
                                                <CreditCard size={16} /> Digital Pay
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ⚡ SPRINT 22: THE UNIVERSAL PAYMENT ENGINE */}
            <SmartPaymentEngine 
                isOpen={isEngineOpen}
                onClose={() => setIsEngineOpen(false)}
                amount={engineAmount}
                orderIds={engineOrderIds}
                venueId={venueId as string}
                onSuccessCallback={() => {
                    handleReset();
                }}
            />
        </div>
    );
}