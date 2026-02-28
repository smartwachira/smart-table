// "Global brain" of the Shopping cart
import { createContext, useState, useEffect,useContext} from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) =>{
    // 1. Load initial cart and VenueId from local storage if it exists
    const [cartItems, setCartItems] = useState(()=>{
        const localData = localStorage.getItem('smartTableCart');
        return localData ? JSON.parse(localData) :[];
    });

    //Manage venue ID in State and Localstorage
    const [venueId, setVenueId] = useState((()=>{
        return localStorage.getItem("smartTableVenueId") || null;
    }));

    // Add Visibility state
    const [isCartOpen, setIsCartOpen] = useState(false);

    const toggleCart = ()=> setIsCartOpen(prev=>!prev);

    // const [venueId, setVenueId] = useState(()=>{
    //     return localStorage.getItem("smartTableVenueId") || null;
    // })

    // 2. Save the cart and VenueId (Whenever cart changes, save it to local storage)
    useEffect(()=>{
        localStorage.setItem("smartTableCart", JSON.stringify(cartItems));
    }, [cartItems]);
    // useEffect(()=>{
    //     localStorage.setItem("smartTableVenueId", venueId);
    // }, [venueId]);

    //3. Add item to cart
    const addToCart = (item )=>{
        setCartItems((prevItems) =>{
            //check if item  is already in cart
            const existingItem = prevItems.find((i)=> i.id === item.id);
            //If yes just increase quantity
            if (existingItem) {
                // If yes, just increase quantity
                toast.success(`Updated ${item.name}`);
                return prevItems.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                // If no, add new item with quantity 1
                toast.success(`Added ${item.name} to order`);
                return [...prevItems, { ...item, quantity: 1 }];
            }
        });
    };

    //Function: Remove item (or decrease quantity)
    const removeFromCart = (itemId) => {
        setCartItems((prevItems) =>
            prevItems.reduce((acc, item) => {
                // FIX: Use 'id', not 'item_id'
                if (item.id === itemId) {
                    // If quantity is 1, remove it (skip adding to acc)
                    if (item.quantity === 1) {
                        toast.error("Item removed");
                        return acc;
                    }
                    // Otherwise, decrease quantity
                    return [...acc, { ...item, quantity: item.quantity - 1 }];
                }
                // Keep other items
                return [...acc, item];
            }, [])
        );
    };

    //Function : Calculate Total count
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    //Function : Calculate Total Price
    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    //Function : Clear the cart
    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider value={{
            cartItems, 
            addToCart, 
            removeFromCart, 
            cartCount, 
            cartTotal, 
            clearCart,
            isCartOpen,
            setIsCartOpen,
            toggleCart,
            venueId,
            setVenueId
            }}>
            {children}
        </CartContext.Provider>
    );
};

export default CartProvider;

