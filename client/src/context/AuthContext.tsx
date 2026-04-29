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
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ⚡ FIX 1: Explicitly tell TypeScript this can be a User OR null
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    const login = async (token: string) => {
        localStorage.setItem('auth_token', token);
        
        try {
            const decoded = jwtDecode<JwtDecodedPayload>(token);
            setUser({
                userId: decoded.userId,
                // ⚡ FIX 2: Explicitly cast the generic string role to our strict UserRole type
                role: decoded.role as UserRole,
                venueId: decoded.venueId,
                name: decoded.name
            });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            toast.error('Failed to login staff');
            console.error('Failed to process login token:', error);
        } 
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    useEffect(() => {
        const initializeWorkspace = () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const decoded = jwtDecode<JwtDecodedPayload>(token);
                    // Check if the token has expired
                    if (decoded.exp * 1000 < Date.now()){
                        console.warn("Session expired.");
                        logout();
                    } else {
                        // Globalize the token for all future axios requests
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        login(token);
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
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// ⚡ FIX 3: Enforce strict non-undefined return type so child components don't throw errors
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};