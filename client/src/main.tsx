import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Removed CartProvider from here
import axios, { InternalAxiosRequestConfig } from 'axios';

// 🛡️ Typed Axios Interceptor
axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Set the Base URL dynamically
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);