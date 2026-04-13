// This  manages your global multi-tenant state.

import { createContext,useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { toast } from 'sonner';


const AuthContext = createContext();

export const AuthProvider = ({ children }) =>{
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    
   
    const login = async (token) =>{
        localStorage.setItem('auth_token',token);
        const decoded = jwtDecode(token);
        try {

            setUser({
            userId: decoded.userId,
            role: decoded.role,
            venueId: decoded.venueId,
            name:decoded.name
        });

        } catch (error) {
            toast.error('Failed to login staff');
            console.error('Failed to login staff:',error)
        } 
    }
    const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    };

    useEffect(()=>{
        const initializeWorkspace = () => {
            const token = localStorage.getItem('auth_token');
            if (token){
                try {
                    const decoded = jwtDecode(token);
                    // Check if the token has expired
                    if (decoded.exp * 1000 < Date.now()){
                        console.warn("Session expired.")
                        logout();
                    } else {
                        //Globalise the token for all future axios request
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        login(token);
                    }
                } catch (err){
                    console.log("Invalid token format.",err);
                    logout();
                }
            }
            setIsLoading(false);
        
        }
        initializeWorkspace();
    },[]);


    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );

    
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);


