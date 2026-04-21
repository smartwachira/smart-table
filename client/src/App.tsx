import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner'; // ⚡ Unified UI: Swapped to Sonner for modern, fast notifications
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

// --- Kitchen KDS ---
import Kitchen from "./components/Kitchen";

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          {/* Global UI layer for notifications */}
          <Toaster position="top-right" richColors />
          
          <Routes>
            {/* ==========================================
                GUEST / CUSTOMER FACING ROUTES
            ========================================== */}
            <Route path="/" element={<ScanPage />} />
            <Route path="/table/:venueId/:tableName" element={<QRGateway />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:orderId" element={<OrderStatus />} />

            {/* ==========================================
                STAFF / ONBOARDING ROUTES
            ========================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<VenueRegistration />} />

            {/* ==========================================
                DASHBOARD & MANAGEMENT ROUTES
            ========================================== */}
            <Route element={<PrivateRoute allowedRoles={['MANAGER', 'OWNER', 'WAITER']} />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="orders" element={<LiveOrders />} />
                <Route path="pos" element={<POS />} />
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="history" element={<OrderHistory />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="qr" element={<QRGenerator />} />
                <Route path="settings" element={<Settings />} />
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
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;