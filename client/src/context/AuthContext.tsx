import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { toast } from 'sonner';

// 🛡️ Strict Types
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN_STAFF' | 'GUEST';

export interface User {
    userId: string;
    role: UserRole;
    venueId: string;
    name?: string;
}

interface JwtDecodedPayload {
    userId: string;
    role: string;
    venueId: string;
    name?: string;
    exp: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;     // ⚡ Explicitly requested by POS
    venueId: string | null;   // ⚡ Explicitly requested by POS
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ⚡ Add explicit state for the token
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // ⚡ Derived State: venueId is always tied to the logged-in user
    const venueId = user?.venueId || null;
    
    const login = async (newToken: string) => {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken); // Update React State
        
        try {
            const decoded = jwtDecode<JwtDecodedPayload>(newToken);
            setUser({
                userId: decoded.userId,
                role: decoded.role as UserRole,
                venueId: decoded.venueId,
                name: decoded.name
            });
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } catch (error) {
            toast.error('Failed to login staff');
            console.error('Failed to process login token:', error);
        } 
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setToken(null); // Clear token state
    };

    useEffect(() => {
        const initializeWorkspace = () => {
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken) {
                try {
                    const decoded = jwtDecode<JwtDecodedPayload>(storedToken);
                    // Check if the token has expired
                    if (decoded.exp * 1000 < Date.now()){
                        console.warn("Session expired.");
                        logout();
                    } else {
                        // Globalize the token for all future axios requests
                        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                        
                        // Hydrate the state directly to avoid re-render loops
                        setToken(storedToken);
                        setUser({
                            userId: decoded.userId,
                            role: decoded.role as UserRole,
                            venueId: decoded.venueId,
                            name: decoded.name
                        });
                    }
                } catch (err) {
                    console.log("Invalid token format.", err);
                    logout();
                }
            }
            setIsLoading(false);
        };
        initializeWorkspace();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, venueId, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};