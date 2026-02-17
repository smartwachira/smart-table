import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import '/index.css'
import axios from 'axios';

//Set the Base URL dynamically
//If we are in production (Vercel), use the Environment Variable
//If we are in development (Localhost), use nothing (relies on proxy)
if (import.meta.env.VITE_API_URL){
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
