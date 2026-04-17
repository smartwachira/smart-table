import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import axios from "axios";
import "./index.css";

// --- Context Providers ---
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext'; 

// --- Public Customer Components ---
import Menu from './components/Menu';
import Checkout from "./components/Checkout";
import OrderStatus from "./components/OrderStatus";
import ScanPage from "./components/ScanPage";
import QRGateway from "./components/QRGateway";

// --- Auth & Onboarding Components ---
import Login from "./components/Login";
import VenueRegistration from "./components/VenueRegistration";
import PrivateRoute from "./components/PrivateRoute";

// --- Layouts ---
import DashboardLayout from "./layouts/DashboardLayout";

// --- Dashboard Sub-Components ---
import DashboardOverview from "./components/dashboard/DashboardOverview";
import StaffManagement from "./components/dashboard/StaffManagement";
import LiveOrders from "./components/dashboard/LiveOrders";
import OrderHistory from "./components/dashboard/OrderHistory";
import MenuManagement from "./components/dashboard/MenuManagement";
import QRGenerator from "./components/dashboard/QRGenerator";
import Settings from "./components/dashboard/Settings";
import POS from './components/dashboard/POS';
import MyOrders from './components/dashboard/MyOrders';

// --- Terminal Components ---
import Kitchen from "./components/Kitchen";

// ⚡ HELPER COMPONENT: Global Axios Interceptor
// Must be rendered INSIDE the <Router> so useNavigate() is available.
function AxiosInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. REQUEST INTERCEPTOR: Attach the correct token before sending
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const currentPath = window.location.pathname;

      // ⚡ FIX: Use startsWith to prevent /dashboard/menu from colliding with /menu
      const isGuestRoute = currentPath.startsWith('/menu') || 
                           currentPath.startsWith('/checkout') || 
                           currentPath.startsWith('/order-status');

      // Grab the appropriate token
      const token = isGuestRoute
        ? localStorage.getItem('guest_token')
        : localStorage.getItem('auth_token');

      if (token){
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 2. RESPONSE INTERCEPTOR: Handle 401s properly based on context
    const resInterceptor = axios.interceptors.response.use(
      (response) => response, 
      (error) => {
        // If the backend says the token is dead or invalid
        if (error.response && error.response.status === 401) {
          const currentPath = window.location.pathname;
          
          // ⚡ FIX: Use startsWith for precise routing bounds
          const isGuestRoute = currentPath.startsWith('/menu') || 
                               currentPath.startsWith('/checkout') || 
                               currentPath.startsWith('/order-status');
                               
          const isStaffRoute = currentPath.startsWith('/dashboard') || 
                               currentPath.startsWith('/kitchen');
          
          if (isGuestRoute) {
            localStorage.removeItem('guest_token');
            navigate('/scan', { replace: true });
          } else if (isStaffRoute) {
            localStorage.removeItem('auth_token');
            navigate('/login', { replace: true });
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup on unmount
    return () => {
      // ⚡ FIX: Corrected typo. reqInterceptor must be ejected from .request!
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, [navigate]);

  return children; 
}

// ⚡ MAIN APP COMPONENT
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-center" reverseOrder={false} />
          
          {/* We wrap the Routes inside the Interceptor so it mounts and activates! */}
          <AxiosInterceptor>
            <Routes>
              
              {/* ==========================================
                  PUBLIC CUSTOMER FLOW (Mobile First)
              ========================================== */}
              <Route path="/q/:venueId/:tableName" element={<QRGateway />} />
              <Route path="/menu" element={<Menu/>}/>
              <Route path="/scan" element={<ScanPage/>}/>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-status/:orderId" element={<OrderStatus />} />

              {/* ==========================================
                  AUTHENTICATION & ONBOARDING
              ========================================== */}
              <Route path="/register" element={<VenueRegistration />} />
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<div className="min-h-screen flex items-center justify-center bg-slate-50"><h1 className="text-2xl font-bold text-slate-800">Welcome to SmartTable. Scan a QR Code.</h1></div>} />

              {/* ==========================================
                  PROTECTED MANAGEMENT DASHBOARD
              ========================================== */}
              <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER']} />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardOverview/>}/>
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="orders" element={<LiveOrders />} />
                  <Route path='pos' element={<POS />}/>
                  <Route path='my-orders' element={<MyOrders/>}/>
                  <Route path="history" element={<OrderHistory />} />
                  <Route path="menu" element={<MenuManagement />} />
                  <Route path="qr" element={<QRGenerator />} />
                  <Route path="settings" element={<Settings/>}/>
                </Route>
              </Route>

              {/* ==========================================
                  OPERATIONAL TERMINALS (KDS / Floor)
              ========================================== */}
              <Route element={<PrivateRoute allowedRoles={['KITCHEN_STAFF', 'WAITER', 'OWNER', 'MANAGER']} />}>
                <Route path="/kitchen" element={<Kitchen />} />
              </Route>

              {/* ==========================================
                  CATCH-ALL (404)
              ========================================== */}
              <Route path="*" element={
                <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 text-slate-600">
                  <h2 className="text-4xl font-black mb-2 text-slate-800 tracking-tight">404</h2>
                  <p className="font-medium">Page Not Found</p>
                </div>
              } />

            </Routes>
          </AxiosInterceptor>

        </CartProvider>
      </AuthProvider>
    </Router>
  );
}