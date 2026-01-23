import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from './components/Menu';
import { CartProvider } from "./context/CartContext";
import Checkout from "./components/Checkout";


function App(){
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/menu/:venueId" element={<Menu/>}></Route>
          <Route path="/checkout" element={<Checkout/>}></Route>
          {/* The default Route */}
          {/* (<h1>...</h1>) directly inline. This is fine for simple placeholders, 
          but usually, you would replace this with a <LandingPage /> component later. */}
          <Route path="/" element={<h1>Welcome to SmartTable. Scan a QR Code.</h1>}></Route>
          <Route path="*" element={<div>Page Not Found</div>}></Route>
        </Routes>
      </Router>
    </CartProvider>
  )
}

export default App;