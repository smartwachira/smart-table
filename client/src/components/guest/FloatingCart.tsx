import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCustomerCartStore } from '../../store/useCustomerCartStore'; // ⚡ NEW: Global Zustand Store

// 🛡️ Strict typing for component props
interface FloatingCartProps {
    tableNumber?: string;
}

const FloatingCart: React.FC<FloatingCartProps> = ({ tableNumber }) => {
    // ⚡ Hooked directly into global memory
    const { cart, updateQuantity, isCartOpen, setIsCartOpen, getCartTotals } = useCustomerCartStore();
    const navigate = useNavigate();

    const [isNavigating, setIsNavigating] = useState(false);
    
    // Evaluate totals and item array
    const cartTotals = getCartTotals();
    const cartItems = Object.values(cart);

    // Auto-close if the user removes the last item from the cart
    if (cartTotals.count === 0 && isCartOpen) {
        setIsCartOpen(false);
    }

    const handleCheckout = () => {
        setIsNavigating(true);
        // Small timeout allows the button ripple effect to render before route shift
        setTimeout(() => {
            setIsCartOpen(false);
            const queryParam = tableNumber ? `?table=${encodeURIComponent(tableNumber)}` : '';
            navigate(`/checkout${queryParam}`);
            setIsNavigating(false);
        }, 150);
    };

    return (
        <>
            {/* Backdrop Overlay */}
            {isCartOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300"
                    onClick={() => setIsCartOpen(false)}
                />
            )}

            {/* Slide-Up Drawer (Mobile) / Slide-Left Drawer (Desktop) */}
            <div className={`fixed bottom-0 md:top-0 md:right-0 md:bottom-auto w-full md:w-[400px] h-[85vh] md:h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col rounded-t-3xl md:rounded-none md:rounded-l-3xl ${
                isCartOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'
            }`}>
                
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white rounded-t-3xl md:rounded-none md:rounded-tl-3xl">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <ShoppingBag className="text-indigo-600" size={24} />
                            Your Order
                        </h2>
                        {tableNumber && (
                            <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{tableNumber}</p>
                        )}
                    </div>
                    <button 
                        onClick={() => setIsCartOpen(false)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <ShoppingBag size={48} className="opacity-30" />
                            <p className="font-bold">Your tray is empty.</p>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.item_id} className="flex gap-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                                    {item.image_url ? (
                                        <img 
                                            src={item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e: any) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ShoppingBag size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-slate-900 leading-tight">{item.name}</h4>
                                        <span className="font-bold text-indigo-600 whitespace-nowrap">
                                            {(item.price * item.quantity).toLocaleString('en-KE')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-200 w-fit shadow-sm">
                                        <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-black text-slate-900 w-4 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Drawer Footer (Checkout) */}
                {cartItems.length > 0 && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-4 pb-safe">
                        <div className="flex justify-between items-center text-slate-600 font-medium">
                            <span className="font-bold text-sm">Subtotal</span>
                            <span className="text-xl font-black text-slate-900">
                                {cartTotals.total.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                            </span>
                        </div>
                        <button 
                            onClick={handleCheckout}
                            disabled={isNavigating}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl font-black text-lg transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                            {isNavigating ? 'Processing...' : (
                                <>Checkout & Pay <ArrowRight size={20} /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default FloatingCart;