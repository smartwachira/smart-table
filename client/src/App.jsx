import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from './components/Menu';
import Checkout from "./components/Checkout";
import Kitchen from "./components/Kitchen";
import OrderStatus from "./components/OrderStatus";
import { AuthProvider } from './context/AuthContext';
import Login from "./components/Login";
import VenueRegistration from "./components/VenueRegistration";
import PrivateRoute from "./components/PrivateRoute";
import { Toaster } from 'react-hot-toast';
import "./index.css"
import Mainlayout from "./layouts/MainLayout";


// Temporary mock component for the dashboard until we build it
const Dashboard = () => <div className="min-h-screen bg-black text-white p-10 font-light">Management Dashboard [Protected]</div>;


function App(){

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" reverseOrder={false}/>
        <Routes>
          <Route element={<Mainlayout/>}>
            <Route path="/menu/:venueId" element={<Menu />} />
          </Route>
          <Route path="/menu/:venueId" element={<Menu/>}></Route>
          <Route path="/checkout" element={<Checkout/>}></Route>
          <Route path="/orders" element={<OrderStatus/>}></Route>
          <Route path="/order-status/:orderId" element={<OrderStatus/>}></Route>
          <Route path="/register" element={<VenueRegistration />} />
          <Route path="/login" element={<Login/>}></Route>
          {/* Elite Management Boundary (Owners & Managers ONLY) */}
          <Route element={<PrivateRoute allowedRoles={['OWNER', 'MANAGER']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Add /staff-provisioning, /analytics, etc. here */}
          </Route>

          {/* Operational Terminal Boundary (Staff & Management) */}
          <Route element={<PrivateRoute allowedRoles={['KITCHEN_STAFF', 'WAIT_STAFF', 'OWNER', 'MANAGER']} />}>
              <Route path="/kitchen" element={<Kitchen />} />
          </Route>
          {/* The default Route */}
          {/* (<h1>...</h1>) directly inline. This is fine for simple placeholders, 
          but usually, you would replace this with a <LandingPage /> component later. */}
          {/* <Route path="/" element={<h1>Welcome to SmartTable. Scan a QR Code.</h1>}></Route> */}
          <Route path="*" element={<div>Page Not Found</div>}></Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App;