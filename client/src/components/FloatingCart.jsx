import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function FloatingCart({ tableNumber }) {
    const { cart, updateQuantity, cartTotals, isCartOpen, setIsCartOpen } = useCart();
    const navigate = useNavigate();

    const cartItems = Object.values(cart);

    const handleCheckout = () => {
        setIsCartOpen(false);
        // Navigate to checkout, passing the venue ID and table number
        navigate(`/checkout/?table=${encodeURIComponent(tableNumber)}`);
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
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <ShoppingBag className="text-indigo-600" size={24} />
                            Your Order
                        </h2>
                        <p className="text-sm font-semibold text-slate-500 mt-1">{tableNumber}</p>
                    </div>
                    <button 
                        onClick={() => setIsCartOpen(false)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <ShoppingBag size={48} className="opacity-50" />
                            <p className="font-medium">Your tray is empty.</p>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.item_id} className="flex gap-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                                            <ShoppingBag size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-slate-900 leading-tight">{item.name}</h4>
                                        <span className="font-bold text-slate-900 whitespace-nowrap">
                                            {(item.price * item.quantity).toLocaleString('en-KE')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-100 rounded-full p-1 border border-slate-200 w-fit">
                                        <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-sm active:scale-95">
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold text-slate-900 w-4 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95">
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
                    <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-4 rounded-b-3xl md:rounded-none">
                        <div className="flex justify-between items-center text-slate-600 font-medium">
                            <span>Subtotal</span>
                            <span>{cartTotals.total.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}</span>
                        </div>
                        <button 
                            onClick={handleCheckout}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all active:scale-[0.98] shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                            Checkout & Pay
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}