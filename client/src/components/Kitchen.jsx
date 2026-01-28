import {useState, useEffect } from 'react';
import { Await, useParams } from 'react-router-dom';
import axios from 'axios';
import './Kitchen.css';
import { useCallback } from 'react';

const Kitchen = () => {
    const { venueId } = useParams();
    const [orders, setOrders] = useState();
    const [loading, setLoading] = useState(loading);

    const fetchOrders = useCallback(async () => {
            
            try {
                const response = await axios.get(`/api/orders/${venueId}`);
                setOrders(response.data);
                
            } catch (error){
                console.error("Error Loading orders:", error);
            } finally {
            setLoading(false);}
        }, [venueId]); 

    //Initial Load + Auto-Refresh every 30 seconds
    useEffect(() =>{


        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    },[venueId, fetchOrders]);

    if (loading) return <div className="kitchen-loading">Loading Orders...</div>

    return (
        <div className="kitchen-container">
            <header className="kitchen-header">
                <h1>Kitchen Display System (KDS)</h1>
                <button onClick={fetchOrders} className="refresh-btn">Refresh</button>
            </header>

            <div className="orders-grid">
                {orders.length === 0 ? ( <p>No active orders.</p>):(
                    orders.map((order) =>{
                        <div key={order.order_id} className={`order-card ${order.status}`}>
                            <div className="order-header">
                                <span className="table-badge">Table {order.table_number}</span>
                                <span className="order-time">
                                    {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            <ul className="order-items-list">
                                {order.OrderItems.map((item) =>(
                                    <li key={item.order_item_id}>
                                        <span className="qty-circle">{item.quantity}x</span>
                                        {/* Access nested MenuItem name if available, else fallback */}
                                        <span className="item-name">
                                            {item.MenuItem ? item.MenuItem.name : "Unknown Item"}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="order-footer">
                                <span className="status-label">{order.status}</span>
                                <span className="total-price">KES {order.total_amount}</span>
                            </div>
                        </div>
                    })
                )}
            </div>
        </div>
    );
};

export default Kitchen;