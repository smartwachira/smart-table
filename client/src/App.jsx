import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from './components/Menu';
import { CartProvider } from "./context/CartContext";
import Checkout from "./components/Checkout";
import Kitchen from "./components/Kitchen";
import OrderStatus from "./components/OrderStatus";
import Login from "./components/Login ";
import PrivateRoute from "./components/PrivateRoute";
import { Toaster } from 'react-hot-toast';
import "./index.css"
import Mainlayout from "./layouts/MainLayout";

const MenuPage =()=>{
  <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
      <h2 className="text-2xl font-bold text-gray-700">Menu Content Goes Here</h2>
      <p className="text-gray-500 mt-2">We will migrate the Menu Component next.</p>
  </div>
}

function App(){
  return (
    <CartProvider>
      <Router>
        <Toaster position="top-center" reverseOrder={false}/>
        <Routes>
          <Route element={<Mainlayout/>}>
            {/* <Route path="/" element={<MenuPage/>}></Route> */}
          </Route>
          <Route path="/" element={<Menu />} />
          <Route path="/menu/:venueId" element={<Menu/>}></Route>
          <Route path="/checkout" element={<Checkout/>}></Route>
          <Route path="/kitchen/:venueId" element={
            <PrivateRoute allowedRoles={["manager", "kitchen"]}>
              <Kitchen/>
            </PrivateRoute>}>
          </Route>
          <Route path="/order-status/:orderId" element={<OrderStatus/>}></Route>
          <Route path="/login" element={<Login/>}></Route>
          {/* The default Route */}
          {/* (<h1>...</h1>) directly inline. This is fine for simple placeholders, 
          but usually, you would replace this with a <LandingPage /> component later. */}
          {/* <Route path="/" element={<h1>Welcome to SmartTable. Scan a QR Code.</h1>}></Route> */}
          <Route path="*" element={<div>Page Not Found</div>}></Route>
        </Routes>
      </Router>
    </CartProvider>
  )
}

export default App;