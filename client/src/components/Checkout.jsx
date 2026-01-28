import { useState } from 'react';
import { useNavigate, } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import './Checkout.css';

const Checkout = () => {
  const { cartItems, addToCart, removeFromCart, getCartTotal, venueId } = useCart();
  const navigate = useNavigate();
  
  // State for form inputs
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  //const { venueId } = useParams();

  // Handle Order Submission
  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      alert("Please enter your table number.");
      return;
    }

    try {
        const orderDetails = {
        venueId: venueId,
        tableNumber: tableNumber,
        paymentMethod,
        items: cartItems,
        total: getCartTotal()
        };

        console.log("🚀 DEBUG: Sending Order Payload:", orderDetails);

        // Send to Backend
        await axios.post('/api/orders', orderDetails);

        alert("Order Placed Successfully!");

        navigate('/'); //Go back to home
    } catch (error) {
    console.error("Order failed", error);
    alert("Failed to place order. Try again.");
    // In Sprint 5, we will connect this to the backend API
  };
}
  // Empty Cart State
  if (cartItems.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet.</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <h1>Your Order</h1>
      </header>

      {/* List of Items */}
      <div className="checkout-items">
        {cartItems.map((item) => (
          <div key={item.item_id} className="checkout-item">
            <div className="item-details">
              <h3 className="item-name">{item.name}</h3>
              <p className="item-price">KES {item.price}</p>
            </div>
            
            <div className="quantity-controls">
              <button 
                className="qty-btn" 
                onClick={() => removeFromCart(item.item_id)}
              >
                -
              </button>
              <span className="qty-value">{item.quantity}</span>
              <button 
                className="qty-btn" 
                onClick={() => addToCart(item)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Details Form */}
      <div className="order-form">
        <div className="form-group">
          <label>Table Number</label>
          <input 
            type="text" 
            value={tableNumber} 
            onChange={(e) => setTableNumber(e.target.value)} 
            placeholder="e.g. 5"
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label>Payment Method</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="form-select"
          >
            <option value="M-Pesa">M-Pesa</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Footer */}
      <div className="checkout-footer">
        <div className="total-section">
          <span className="total-label">Total</span>
          <span className="total-amount">KES {getCartTotal().toFixed(2)}</span>
        </div>
        <button className="confirm-btn" onClick={handlePlaceOrder}>
          Confirm Order
        </button>
      </div>
    </div>
  );
};

export default Checkout;