// This  manages your global multi-tenant state.

import { createContext,useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';


const AuthContext = createContext();

export const AuthProvider = ({ children }) =>{
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
   

    useEffect(()=>{
        const initializeAuth = () => {
            const token = localStorage.getItem('token');
            if (token){
                try {
                    const decoded = jwtDecode(token);
                    // Check if the token has expired
                    if (decoded.exp * 1000 < Date.now()){
                        localStorage.removeItem('token');
                    } else {
                        setUser({ 
                            userId: decoded.userId, 
                            role: decoded.role, 
                            venueId: decoded.venueId 
                        });
                    }
                } catch (err){
                    console.log("Invalid token format.",err);
                    localStorage.removeItem('token');
                }
            }
            setIsLoading(false);
        };
        
        initializeAuth();
    },[]);

    const login = (token) =>{
        localStorage.setItem('token',token);
        const decoded = jwtDecode(token);
        setUser({
            userId: decoded.userId,
            role: decoded.role,
            venueId: decoded.venueId
        });
    }
    const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );

    
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);


