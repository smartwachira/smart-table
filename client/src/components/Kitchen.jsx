// Kitchen Display System (KDS)- 
// it acts as the digital screen for chefs to see incoming orders in real-time

import {useState, useEffect } from 'react';
import { Await, useParams } from 'react-router-dom';
import axios from 'axios';
import './Kitchen.css';
import { useCallback } from 'react';



const Kitchen = () => {
    const { venueId } = useParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const userRole = localStorage.getItem("role");

    // Function:The "Fetcher"
    const fetchOrders = useCallback(async () => {
            
        try {
            //Get Token , Stop if no token
            const token = localStorage.getItem('token');
            if (!token) return;
            

            //Get order and send token
            const response = await axios.get(`/api/orders/${venueId}`,{
                header: {Authorization: token}
            });
            if (!response){
                console.log("no orders")
            }
            setOrders(response.data);
                
        } catch (error){
            console.error("Error Loading orders:", error);
        } finally {
            setLoading(false);
        }
    }, [venueId]);
    
    // Function: Update order status
    const handleStatusChange = async (orderId, newStatus)=>{
        try {
            //Get Token , Stop if no token
            const token = localStorage.getItem('token');
            if (!token) return;
            console.log("Token",token)


            await axios.patch(`/api/orders/${orderId}/status`, 
                {status: newStatus},
                {headers: { Authorization: `Bearer ${token}`}} //<--- Send Token
            );
            fetchOrders();
        } catch (error){
            alert("Failed to update status");
            console.error("Error updating status",error);
        }
    }

    // Delete Function
    const handleDelete = async (orderId) => {
        if(!window.confirm("Are you sure you want to DELETE this order?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/orders/${orderId}`,
                {headers: {Authorization: token}}
            );
            fetchOrders(); //Refresh list
        }catch(error){
            alert("Failed to delete: "+ (error.response?.data?.message || error.message))
        }
    }

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
                        
                         return (
                        
                            <div key={order.order_id} className={`order-card ${order.status}`}>
                                <div className="order-header">
                                    <span className="table-badge">Table {order.table_number}</span>
                                    <span className="customer-name-tag">👤 {order.customer_name}</span>
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
                                    <div className="action-buttons">
                                        {/* CHEF/MANAGER ACTION: Mark Ready */}
                                        {order.status === "pending" && (
                                            <button className="complete-btn" onClick={()=> handleStatusChange(order.order_id, 'served')}>Mark Ready ✅</button>
                                        )}

                                        {/* MANAGER ACTION ONLY: Delete */}
                                        {userRole === 'manager' && (
                                            <button className="delete-btn" onClick={()=>handleDelete(order.order_id)}>🗑️ Void</button>
                                        )}
                                    </div>
                                    
                                    <span className="total-price">KES {order.total_amount}</span>
                                </div>
                            </div>
                        )
                    })
                )};
            </div>
        </div>
    );
};

export default Kitchen;