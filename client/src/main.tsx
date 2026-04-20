import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CartProvider from './context/CartContext.jsx'
import App from './App.js'
import './index.css'
import axios from 'axios';

axios.interceptors.request.use((config)=>{
  const token = localStorage.getItem('token');
  if (token){
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error)=>{
  return Promise.reject(error);
})

//Set the Base URL dynamically
//If we are in production (Vercel), use the Environment Variable
//If we are in development (Localhost), use nothing (relies on proxy)
if (import.meta.env.VITE_API_URL){
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
)
