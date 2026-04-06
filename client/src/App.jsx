import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import "./index.css";

// --- Context Providers ---
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext'; 

// --- Public Customer Components ---
import Menu from './components/Menu';
import Checkout from "./components/Checkout";
import OrderStatus from "./components/OrderStatus";

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
import Settings from "./components/dashboard/Settings"

// --- Terminal Components ---
import Kitchen from "./components/Kitchen";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-center" reverseOrder={false} />
          
          <Routes>
            {/* ==========================================
                PUBLIC CUSTOMER FLOW (Mobile First)
            ========================================== */}
            <Route path="/menu/:venueId" element={<Menu />} />
            <Route path="/checkout/:venueId" element={<Checkout />} />
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
                {/* Default Dashboard Route */}
                <Route index element={<DashboardOverview/>}/>
                
                <Route path="staff" element={<StaffManagement />} />
                <Route path="orders" element={<LiveOrders />} />
                <Route path="history" element={<OrderHistory />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="qr" element={<QRGenerator />} />
                <Route path="settings" element={<Settings/>}/>
              </Route>
            </Route>

            {/* ==========================================
                OPERATIONAL TERMINALS (KDS / Floor)
            ========================================== */}
            {/* Note: Updated WAIT_STAFF to WAITER to match DB ENUM */}
            <Route element={<PrivateRoute allowedRoles={['KITCHEN_STAFF', 'WAITER', 'OWNER', 'MANAGER']} />}>
              <Route path="/kitchen" element={<Kitchen />} />
            </Route>

            {/* ==========================================
                CATCH-ALL (404)
            ========================================== */}
            <Route path="*" element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
                <h2 className="text-4xl font-black mb-2">404</h2>
                <p>Page Not Found</p>
              </div>
            } />

          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;