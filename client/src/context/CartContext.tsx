// "Global brain" of the Shopping cart
import React,{ createContext, useState, useMemo,useContext,ReactNode} from 'react';

// 🛡️ Strict Types
export interface CartItem {
    item_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
}

export interface VenueConfig {
    tax_rate?: string | number;
}

export interface CartTotals {
    count: number;
    subtotal: number;
    taxAmount: number;
    total: number;
}

interface CartContextType {
    cart: Record<string, CartItem>;
    isCartOpen: boolean;
    setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
    venueConfig: VenueConfig | null;
    setVenueConfig: React.Dispatch<React.SetStateAction<VenueConfig | null>>;
    updateQuantity: (item: Omit<CartItem, 'quantity'>, delta: number) => void;
    clearCart: () => void;
    toggleCart: () => void;
    cartTotals: CartTotals;
}
const CartContext = createContext<CartContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) =>{
    // cart state is an object: { 'item_uuid': {...itemData,quantity:2}}
    const [cart, setCart] = useState<Record<string, CartItem>>({});
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

    //Store venue settings globally for the checkout flow
    const [venueConfig, setVenueConfig] = useState<VenueConfig | null>(null);

    //Add or remove quantity. If quantity hits 0, remove item entirely.
    const updateQuantity = (item: Omit<CartItem, 'quantity'>, delta: number)=>{
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
    const cartTotals = useMemo<CartTotals>(()=>{
        const subtotal = Object.values(cart).reduce((acc,item) => acc + (item.price * item.quantity),0);
        const count = Object.values(cart).reduce((acc, item) => acc + item.quantity,0);

        // Calculate tax based on venue settings (Default to 0 if not loaded)
        const taxRate = venueConfig?.tax_rate ? parseFloat(venueConfig.tax_rate.toString()) : 0;
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

