import { create } from 'zustand';
import { MenuItem } from '../components/dashboard/MenuManagement';

export interface CartItem extends MenuItem {
    cart_id: string; // Unique ID for the specific cart entry (in case of duplicates)
    quantity: number;
    notes?: string;
}

interface CartState {
    items: CartItem[];
    activeTable: string | null;
    
    // Actions
    addItem: (item: MenuItem, quantity?: number, notes?: string) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, quantity: number) => void;
    updateNotes: (cartId: string, notes: string) => void;
    clearCart: () => void;
    setActiveTable: (tableId: string | null) => void;
    
    // Computed (Getters)
    getCartTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    activeTable: null,

    addItem: (item, quantity = 1, notes = '') => set((state) => {
        // Check if identical item (same ID and notes) already exists to stack them
        const existingItemIndex = state.items.findIndex(
            i => i.item_id === item.item_id && i.notes === notes
        );

        if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems };
        }

        // Add new unique entry
        return { 
            items: [...state.items, { 
                ...item, 
                cart_id: crypto.randomUUID(), 
                quantity, 
                notes 
            }] 
        };
    }),

    removeItem: (cartId) => set((state) => ({
        items: state.items.filter(i => i.cart_id !== cartId)
    })),

    updateQuantity: (cartId, quantity) => set((state) => ({
        items: quantity <= 0 
            ? state.items.filter(i => i.cart_id !== cartId) 
            : state.items.map(i => i.cart_id === cartId ? { ...i, quantity } : i)
    })),

    updateNotes: (cartId, notes) => set((state) => ({
        items: state.items.map(i => i.cart_id === cartId ? { ...i, notes } : i)
    })),

    clearCart: () => set({ items: [], activeTable: null }),
    
    setActiveTable: (tableId) => set({ activeTable: tableId }),

    getCartTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
    },
    
    getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
    }
}));