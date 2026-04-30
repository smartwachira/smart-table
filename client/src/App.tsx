import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./index.css";

// --- Context Providers ---
import { AuthProvider } from './context/AuthContext';

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

// ⚡ Configure the QueryClient with Enterprise Defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered "fresh" for 30 seconds. 
      // During this time, navigating back to a page will NOT trigger a background refetch.
      staleTime: 30 * 1000, 
      
      // Keep unused cache data in memory for 5 minutes before garbage collecting it.
      gcTime: 5 * 60 * 1000, 
      
      // Refetch automatically when the user clicks back into the browser window
      refetchOnWindowFocus: true,
      
      // Do not endlessly retry failing queries by default
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
            <Toaster position="top-center" richColors />
            
            <Routes>
              {/* ==========================================
                  PUBLIC GUEST ROUTES (Customer Facing)
              ========================================== */}
              <Route path="/" element={<ScanPage />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/status" element={<OrderStatus />} />
              
              {/* ⚡ Updated to match your QR Generator's output */}
              <Route path="/q/:venueId/:tableName" element={<QRGateway />} />

              {/* ==========================================
                  AUTHENTICATION & ONBOARDING
              ========================================== */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<VenueRegistration />} />

              {/* ==========================================
                  UNIFIED ENTERPRISE DASHBOARD & RBAC
              ========================================== */}
              {/* Tier 1: User must be authenticated and have a valid staff role */}
              <Route path="/dashboard" element={
                <PrivateRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF']} />
              }>
                
                {/* Tier 2: The Unified Dashboard Layout */}
                <Route element={<DashboardLayout />}>
                  
                  {/* 🛡️ Owners & Managers Only */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER']} />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="menu" element={<MenuManagement />} />
                    <Route path="qr" element={<QRGenerator />} />
                    <Route path="staff" element={<StaffManagement />} />
                  </Route>

                  {/* 🛡️ Universal Floor/Kitchen Access (The New KDS) */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF']} />}>
                    <Route path="orders" element={<LiveOrders />} />
                  </Route>

                  {/* 🛡️ Point of Sale (FOH Only, No Kitchen Staff) */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER', 'WAITER']} />}>
                    <Route path="pos" element={<POS />} />
                  </Route>

                  {/* 🛡️ Exclusive to Waiters */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER', 'WAITER']} />}>
                    <Route path="my-orders" element={<MyOrders />} />
                  </Route>

                  {/* 🛡️ Financial / History Review */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER']} />}>
                    <Route path="history" element={<OrderHistory />} />
                  </Route>

                  {/* 🛡️ Strictly Locked to Venue Principals */}
                  <Route element={<PrivateRoute allowedRoles={['OWNER']} />}>
                    <Route path="settings" element={<Settings />} />
                  </Route>

                </Route>
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
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;