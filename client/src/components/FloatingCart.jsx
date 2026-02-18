import {useCart} from '../context/CartContext';
import { Link } from 'react-router-dom';
import { X,Plus,Minus,Trash2,ShoppingBag, XLineTop} from 'lucide-react'

const FloatingCart = () =>{
    const { 
        cartItems,
        isCartOpen,
        setIsCartOpen,
        removeFromCart,
        addToCart,
        cartTotal,
        
    } = useCart();
    

    //Don't show if cart is not open
    if (!isCartOpen) return null;

    return (
    <>
      {/* 1. BACKDROP OVERLAY (Darkens the rest of the screen) */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* 2. SLIDE-OVER DRAWER */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-surface-muted">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your Order
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Items Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 bg-surface-muted rounded-xl border border-gray-100">
                {/* Item Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>

                {/* Details & Controls */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                    <p className="text-sm text-brand-primary font-bold">
                      {(item.price * item.quantity).toLocaleString()} KES
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-white rounded-lg px-2 py-1 border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:text-red-500 transition-colors"
                      >
                        {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="p-1 hover:text-green-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Checkout Button) */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Total</span>
              <span className="text-2xl font-bold text-gray-900">{cartTotal.toLocaleString()} KES</span>
            </div>
            <Link 
              to="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-brand-primary/30"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default FloatingCart;