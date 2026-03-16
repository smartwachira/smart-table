// "Global brain" of the Shopping cart
import React,{ createContext, useState, useMemo,useContext} from 'react';

const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) =>{
    // cart state is an object: { 'item_uuid': {...itemData,quantity:2}}
    const [cart, setCart] = useState({});
    const [isCartOpen, setIsCartOpen] = useState(false);

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

    //Auto-calculate totals without triggering unnecessary re-renders
    const cartTotals = useMemo(()=>{
        return Object.values(cart).reduce((acc, item)=>({
            count: acc.count + item.quantity,
            total: acc.total +  (item.price * item.quantity)
        }),{count:0,total: 0});
    },[cart]);

    return (
        <CartContext.Provider value={{
            cart,
            updateQuantity,
            clearCart,
            cartTotals,
            isCartOpen,
            setIsCartOpen,
            toggleCart
        }}
        >
            {children}
        </CartContext.Provider>
    )
};

export default CartProvider;

