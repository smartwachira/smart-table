// "Global brain" of the Shopping cart
import { createContext, useState, useEffect,useContext} from 'react';
const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) =>{
    // 1. Load initial cart and VenueId from local storage if it exists
    const [cartItems, setCartItems] = useState(()=>{
        const localData = localStorage.getItem('smartTableCart');
        return localData ? JSON.parse(localData) :[];
    });

    const [venueId, setVenueId] = useState(()=>{
        return localStorage.getItem("smartTableVenueId") || null;
    })

    // 2. Save the cart and VenueId (Whenever cart changes, save it to local storage)
    useEffect(()=>{
        localStorage.setItem("smartTableCart", JSON.stringify(cartItems));
    }, [cartItems]);
    useEffect(()=>{
        localStorage.setItem("smartTableVenueId", venueId);
    }, [venueId]);

    //3. Add item to cart
    const addToCart = (item )=>{
        setCartItems((prevItems) =>{
            //check if item  is already in cart
            const existingItem = prevItems.find((i)=> i.item_id === item.item_id);
            //If yes just increase quantity
            if (existingItem) {
                // If yes, just increase quantity
                return prevItems.map((i) =>
                i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                // If no, add new item with quantity 1
                return [...prevItems, { ...item, quantity: 1 }];
            }
        });
    };

    //Function: Remove item (or decrease quantity)
    const removeFromCart = (itemId) =>{
        setCartItems((prevItems) =>
            prevItems.reduce((acc, item)=>{
                if (item.item_id === itemId){
                    if (item.quantity === 1) return acc;
                    return [...acc, {...item, quantity: item.quantity - 1}];
                }
                return [...acc, item];
            }, [])
        );
    };

    //Function : Calculate Total Price
    const getCartTotal = () =>{
        return cartItems.reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0);
    };

    //Function: Count Total Items
    const getCartCount = () =>{
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    };

    //Function : Clear the cart
    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider value={{
            cartItems, 
            addToCart, 
            removeFromCart, 
            getCartTotal, 
            getCartCount, 
            clearCart,
            venueId,
            setVenueId
            }}>
            {children}
        </CartContext.Provider>
    );
};

export default CartProvider;

