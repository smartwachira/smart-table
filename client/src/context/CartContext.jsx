// "Global brain" of the Shopping cart
import React,{ createContext, useState, useMemo,useContext} from 'react';

const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) =>{
    // cart state is an object: { 'item_uuid': {...itemData,quantity:2}}
    const [cart, setCart] = useState({});
    const [isCartOpen, setIsCartOpen] = useState(false);

    //Store venue settings globally for the checkout flow
    const [venueConfig, setVenueConfig] = useState(null);

    //Add or remove quantity. If quantity hits 0, remove item entirely.
    const updateQuantity = (item, delta)=>{
        setCart(prev=>{
            const currentQty = prev[item.item_id]?.quantity || 0;
            const newQty = currentQty + delta;

            if (newQty <= 0){
                const newCart = {...prev};
                delete newCart[item.item_id];
                return newCart;
            }

            return {
                ...prev,
                [item.item_id]: {...item, quantity: newQty}
            };
        });
    };

    const clearCart   = ()=>setCart({});

    const toggleCart=()=>setIsCartOpen(!isCartOpen);

    //Auto-calculate totals and Tax without triggering unnecessary re-renders
    const cartTotals = useMemo(()=>{
        const subtotal = Object.values(cart).reduce((acc,item) => acc + (item.price * item.quantity),0);
        const count = Object.values(cart).reduce((acc, item) => acc + item.quantity,0);

        // Calculate tax based on venue settings (Default to 0 if not loaded)
        const taxRate = venueConfig?.tax_rate ? parseFloat(venueConfig.tax_rate) : 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal +  taxAmount;

        return {count,subtotal,taxAmount,total};
    },[cart,venueConfig]);

    return (
        <CartContext.Provider value={{
            cart,
            updateQuantity,
            clearCart,
            cartTotals,
            isCartOpen,
            setIsCartOpen,
            toggleCart,
            venueConfig,
            setVenueConfig
        }}
        >
            {children}
        </CartContext.Provider>
    )
};

export default CartProvider;

