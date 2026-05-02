import axios from 'axios';
import { toast } from 'sonner'; // Assuming you use Sonner or react-hot-toast
import { useGuestSessionStore } from '../store/useGuestSessionStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    timeout: 10000, 
});

api.interceptors.request.use(
    (config) => {
        const guestToken = localStorage.getItem('guest_token');
        const staffToken = localStorage.getItem('auth_token'); 
        const token = guestToken || staffToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const guestSessionId = useGuestSessionStore.getState().guestSessionId;
        if (guestSessionId) {
            config.headers['x-guest-id'] = guestSessionId;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ⚡ NEW: Global Response Interceptor for Network Level Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Catch ERR_CONNECTION_REFUSED or Network Errors
        if (error.code === 'ERR_NETWORK') {
            toast.error("Cannot reach the restaurant server. Please check your Wi-Fi or ask a waiter.", {
                duration: 5000,
                icon: '📡', 
                style: { background: '#fef2f2', color: '#dc2626', borderColor: '#f87171' }
            });
        }
        
        // You can also handle global 401s here
        if (error.response?.status === 401) {
            // e.g., clear localStorage and redirect to /scan
        }

        return Promise.reject(error);
    }
);

export default api;