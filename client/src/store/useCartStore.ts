import { create } from 'zustand';

// ⚡ 1. Define exactly what a CartItem looks like for the POS
export interface CartItem {
    item_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
}

// ⚡ 2. Define the exact blueprint of the store
export interface CartState {
    // Defines 'cart' as a dictionary object for instant O(1) lookups
    cart: Record<string, CartItem>; 
    
    // Explicitly define the methods POS is trying to destructure
    addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeFromCart: (item_id: string) => void;
    updateQuantity: (item_id: string, delta: number) => void;
    clearCart: () => void;
    getCartTotal: () => number;
}

// ⚡ 3. Implement the store using the blueprint
export const useCartStore = create<CartState>((set, get) => ({
    cart: {}, // Start with an empty dictionary

    addToCart: (item) => set((state) => {
        const existingItem = state.cart[item.item_id];
        
        // If it exists, stack the quantity
        if (existingItem) {
            return {
                cart: {
                    ...state.cart,
                    [item.item_id]: { 
                        ...existingItem, 
                        quantity: existingItem.quantity + (item.quantity || 1) 
                    }
                }
            };
        }
        
        // If it's new, add it to the dictionary
        return {
            cart: {
                ...state.cart,
                [item.item_id]: { ...item, quantity: item.quantity || 1 } as CartItem
            }
        };
    }),

    removeFromCart: (item_id) => set((state) => {
        const newCart = { ...state.cart };
        delete newCart[item_id]; // Remove key from dictionary
        return { cart: newCart };
    }),

    // Delta math (+1 or -1) as expected by the new POS UI
    updateQuantity: (item_id, delta) => set((state) => {
        const item = state.cart[item_id];
        if (!item) return state;

        const newQuantity = item.quantity + delta;
        
        // If quantity drops to 0 or below, remove the item entirely
        if (newQuantity <= 0) {
            const newCart = { ...state.cart };
            delete newCart[item_id];
            return { cart: newCart };
        }

        return {
            cart: {
                ...state.cart,
                [item_id]: { ...item, quantity: newQuantity }
            }
        };
    }),

    clearCart: () => set({ cart: {} }),

    getCartTotal: () => {
        const { cart } = get();
        // Convert dictionary back to array just to calculate the sum
        return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
    }
}));