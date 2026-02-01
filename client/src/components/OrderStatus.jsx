// Customer Tracking Screen
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrderStatus.css';
import { useCallback } from 'react';

const OrderStatus = () =>{
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);

    //The "Fetcher"

    const fetchStatus = useCallback(async () => {
        try {
            const res = await axios.get(`/api/orders/track/${orderId}`);
            setOrder(res.data);
        } catch (error) {
            console.error("Error fetching status",error);
        } finally {
            console.log("Status updated")
        }
    },[orderId]);

    useEffect(()=>{

        fetchStatus(); //1. Check immediately when page loads
        const interval = setInterval(fetchStatus, 5000); // 2. Poll every 5 seconds
        return () => clearInterval(interval); //3. Stop checking if user leaves page
    }, [orderId, fetchStatus]);

    if (!order) return <div className="loading">Finding your order...</div>

    const isCompleted = order.status === 'served';

    return (
        <div className="status-container">
            <div className="status-card">
                <h1>Order Status</h1>
                <div className={`status-badge ${order.status}`}>
                    {order.status.toUpperCase()}
                </div>

                <p className="order-id">Order #{order.order_id.slice(0, 8)}</p>
                <p className="table-info">Table {order.table_number} • {order.customer_name} </p>

                <div className="progress-bar-container">
                    <div className={`progress-step active`}>Received</div>
                    <div className={`progress-line ${isCompleted? 'active' : ''}`}></div>
                    <div className={`progress-step ${isCompleted ? 'active' : ''}`}>Ready!</div>
                </div>

                <div className="order-summary">
                    <h3>Your Items</h3>
                    {order.OrderItems.map(item=>(
                        <div key={item.order_item_id} className="summary-item">
                            <span>{item.quantity}x {item.MenuItem?.name}</span>
                        </div>

                    ))}
                </div>

                {isCompleted &&  (
                    <div className="ready-message">
                        <h2>🍽️ Your food is ready!</h2>
                        <p>Please wait for the waiter to bring to Table {order.table_number}.</p>
                        <button className="home-btn" onClick={()=> navigate("/")}>Order More</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderStatus;