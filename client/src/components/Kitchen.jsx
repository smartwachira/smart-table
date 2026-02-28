// Kitchen Display System (KDS)- 
// it acts as the digital screen for chefs to see incoming orders in real-time

import {useState, useEffect } from 'react';
import { Await, useParams } from 'react-router-dom';
import axios from 'axios';
//import './Kitchen.css';
import { useCallback } from 'react';
import {useNavigate} from 'react-router-dom';
import toast from 'react-hot-toast';
import io from 'socket.io-client';



// Sound Effect URl
const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';



const Kitchen = () => {
    
    const { venueId } = useParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const userRole = localStorage.getItem("role");
    const navigate = useNavigate();


    // Play Sound Function
    const playSound = ()=>{
        try{
            const audio = new Audio(BEEP_URL);
            audio.play();
        } catch (err){
            console.error("Audio play failed", err);
        }
    };

    // Function:The "Fetcher"
    const fetchOrders = useCallback(async () => {
            
        try {
            //Get Token , Stop if no token
            const token = localStorage.getItem('token');
            if (!token) return;
            

            //Get order and send token
            const response = await axios.get(`/api/orders/${venueId}`,{
                headers: {Authorization: token}
            });
            if (!response){
                console.log("no orders")
            }
            setOrders(response.data);
                
        } catch (error){
            console.error("Error Loading orders:", error);
            toast.error("Could not load orders");
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

            toast.success("Order Updated");
            setOrders(prev => prev.map(o =>
                o.order_id === orderId ? { ...o, status: newStatus} : o
            ))
        } catch (error){
            toast.error("Failed to update status");
            console.error("Error updating status",error);
        }
    }

    // Delete Function
    const handleDelete = async (orderId) => {
        //Safety switch
        if(!window.confirm("Are you sure you want to DELETE this order?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/orders/${orderId}`,
                {headers: {Authorization: `Bearer ${token}`}}
            );
            toast.success("Order Voided 🗑️");
            
        }catch(error){
            toast.error("Failed to delete: "+ (error.response?.data?.message || error.message))
        }
    }

    //FUNCTION: Handle Logout
    
    

    const handleLogout  = ()=>{
        localStorage.removeItem('token');
        localStorage.removeItem("role");
        localStorage.removeItem('venueId');
        navigate("/login");
    }

    //Initial Load + Auto-Refresh every 30 seconds
    useEffect(() =>{

        //1. Initial fetch
        fetchOrders();

        //2. Connect to socket "Universal Connector"
        const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000")
        
        //3. Join Venue Room
        socket.emit('join_venue', venueId);

        //Event: Listen  for new Orders
        socket.on('receive_order',(data)=>{

            //Reconstruct the order object(raw data) to match the API structure(nested MenuItem objects)
            const newOrder = {
                ...data.order,
                OrderItems: data.items.map(item => ({
                    order_item_id: item.item_id || Math.random(),
                    quantity: item.quantity,
                    MenuItem: {
                        name: item.name
                    }
                }))
            };

            //Add to top of list
            setOrders(prevOrders => [newOrder, ...prevOrders]);

            //Notify & Beep
            toast.success(`New Order: Table ${newOrder.table_number}`,{
                icon: '🔔',
                duration: 5000
            });
            playSound();
            
        });

        //Event: Order Deleted
        socket.on("delete_order",(deletedOrderId)=>{
            setOrders(prevOrders => prevOrders.filter(o => o.order_id !== deletedOrderId));
            toast('Order Voided', { icon: '🗑️' });
            playSound();
            
        })
        

        
        return () => socket.disconnect();
    },[venueId, fetchOrders]);



    if (loading) return <div className="kitchen-loading">Loading Orders...</div>

    return (
        <div className="kitchen-container">
            <header className="kitchen-header ">
                <h1>Kitchen Display System (KDS)</h1>
                <button onClick={fetchOrders} className="refresh-btn">Refresh</button>
                <button onClick={handleLogout} className="logout-btn" style={{marginLeft: '10px', background: '#333'}}>Logout</button>
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