import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    item_id: string;
    name: string;
    price: number;
    image_url?: string;
    quantity: number;
}

interface CustomerCartState {
    cart: Record<string, CartItem>;
    isCartOpen: boolean;
    venueConfig: any | null; // Stores venue settings (logo, accepting orders, etc.)
    
    // Actions
    setIsCartOpen: (isOpen: boolean) => void;
    setVenueConfig: (config: any) => void;
    updateQuantity: (item: Omit<CartItem, 'quantity'>, delta: number) => void;
    clearCart: () => void;
    
    // Computed Getters
    getCartTotals: () => { count: number; total: number };
}

export const useCustomerCartStore = create<CustomerCartState>()(
    persist(
        (set, get) => ({
            cart: {},
            isCartOpen: false,
            venueConfig: null,

            setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
            
            setVenueConfig: (config) => set({ venueConfig: config }),

            updateQuantity: (item, delta) => set((state) => {
                const newCart = { ...state.cart };
                const currentQty = newCart[item.item_id]?.quantity || 0;
                const newQty = currentQty + delta;

                if (newQty <= 0) {
                    delete newCart[item.item_id];
                } else {
                    newCart[item.item_id] = { ...item, quantity: newQty };
                }

                return { cart: newCart };
            }),

            clearCart: () => set({ cart: {}, isCartOpen: false }),

            getCartTotals: () => {
                const { cart } = get();
                const items = Object.values(cart);
                return {
                    count: items.reduce((sum, item) => sum + item.quantity, 0),
                    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                };
            }
        }),
        {
            name: 'smart-table-customer-cart', // The key used in localStorage
            partialize: (state) => ({ cart: state.cart }), // ONLY persist the cart items, not the UI open/close state
        }
    )
);