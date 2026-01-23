import {useCart} from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './FloatingCart.css';

const FloatingCart = () =>{
    const { cartItems, getCartTotal, getCartCount} = useCart();
    const navigate = useNavigate();

    //Don't show if cart is empty
    if (cartItems.length === 0) return null;

    return (
        <div className="floating-cart" onClick={()=> navigate('/checkout')}>
            <div className="cart-info">
                <span className="cart-count">{getCartCount()} Items</span>
                <span className="cart-Total">
                    KES {getCartTotal().toFixed(2)}
                </span>
            </div>
            <span className="view-cart-text">View Cart &gt;</span>
        </div>
    );
};

export default FloatingCart;