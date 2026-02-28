import { useState, useEffect, useCallback} from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import {ChefHat, RefreshCw, Logout,CheckCircle,Trash2,Clock,User,BellRing} from 'lucide-react';

//Sound Effect URL
const BEEP_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const Kitchen = () =>{
    const { venueId} = useParams();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setIsLoading] = useState(true);
    const userRole = localStorage.getItem("role");

    //Play sound function
    const playSound = useCallback(()=>{
        try{
            const audio = new Audio(BEEP_URL);
            audio.play().catch(e=> console.log("Audio play blocked by browser:",e));

        } catch (err){
            console.error("Audio play failed",err);
        }
    },[]);

    //The "Fetcher"
    const fetchOrders = useCallback(async ()=>{
        try{
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            const response = await axios.get(`/api/orders/${venueId}`,{
                headers: {Authorization: `Bearer ${token}`}
            });

            setOrders(response.data);


        } catch (error){
            console.error("Error Loading orders:", error);
            toast.error("Could not load orders");
        } finally {
            setIsLoading(false)
        }
    }, [venueId,navigate]);


    //Function: Update order status
    const handleStatusChange = async (orderId, newStatus) =>{
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await axios.patch(`/api/orders/${orderId}/status`,
                {status: newStatus},
                {headers: {Authorization: `Bearer ${token}`}}
            );

            toast.success("Order Updated");
            setOrders(prev=>prev.map(o=>
                o.order_id === orderId ? {...o,status:newStatus} : o
            ));
        } catch (error){
            toast.error("Failed to update status");
            console.error("Error updating status", error);
        }
    }

    //Delete Function
    const handleDelete = async (orderId) =>{
        if (!window.confirm("Are you sure you want  to VOID this order?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/orders/${orderId}`,
                { headers: { Authorization: `Bearer ${token}`}}
            );
            toast.success("Order Voided 🗑️");
            // Note: We don't manually filter here because the socket will broadcast 'delete_order' 
            // and remove it for everyone automatically!


        } catch (error){
            toast.error("Failed to delete: " + (error.response?.data?.message || error.message));
        }

        //Handle Logout
        const handleLogout = ()=>{
            localStorage.removeItem('token');
            localStorage.removeItem("role");
            localStorage.removeItem('venueId');
            navigate("/login");
        }

        //Determine Status Colors dynamically
        const getStatusColor = (status) =>{
            switch (status) {
                case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
                case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'ready': return 'bg-emerald-100 text-emerald-800  border-emerald-200';
                default:  return 'bg-gray-100 text-gray-800 border-gray-200';
            }
        };

        //Initial Load + Socket Connection
        useEffect(()=>{
            fetchOrders();

            const socket = io(import)
        })


    }
}