import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { dashboardRoutes } from '../config/routeConfig';
import { LogOut, Menu, X, Store, Smartphone } from 'lucide-react';

// 🛡️ Strict Interface for the Venue Settings payload
interface VenueSettings {
    name: string;
    logo_url?: string | null;
}

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [venue, setVenue] = useState<VenueSettings | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

    // Fetch venue details for the header
    useEffect(() => {
        const fetchVenueForSidebar = async () => {
            try {
                const res = await axios.get('/api/settings/venue');
                setVenue(res.data);
            } catch (error) {
                console.error("Failed to load venue name for sidebar", error);
            }
        };
        fetchVenueForSidebar();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 🛡️ THE MAGIC: Filter routes based on the current user's role
    // If the route has showInSidebar: true AND the user's role is in allowedRoles, it renders.
    const authorizedRoutes = dashboardRoutes.filter(route => 
        route.showInSidebar && user && route.allowedRoles.includes(user.role)
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
            
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-2 font-black text-xl tracking-tight truncate">
                    <Store className="text-indigo-400 shrink-0" /> 
                    <span className="truncate">{venue?.name || 'SmartTable'}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-800 rounded-lg active:scale-95 transition-transform">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 hidden md:flex items-center gap-3 font-black text-2xl text-white tracking-tight border-b border-slate-800 truncate">
                    <Store className="text-indigo-500 shrink-0" size={28} /> 
                    <span className="truncate">{venue?.name || 'SmartTable'}</span>
                </div>

                <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-800/30">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30 shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-white truncate">{user?.name || 'Staff Member'}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {/* ⚡ Loop through ONLY the authorized routes generated from routeConfig.ts */}
                    {authorizedRoutes.map((route) => {
                        const Icon = route.icon;
                        return (
                            <NavLink
                                key={route.path}
                                to={route.path}
                                onClick={() => setIsSidebarOpen(false)}
                                end={route.path === '/dashboard'}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
                                    ${isActive 
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                                        : 'hover:bg-slate-800 hover:text-white'
                                    }
                                `}
                            >
                                <Icon size={20} className="shrink-0" />
                                <span>{route.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-colors"
                    >
                        <LogOut size={20} /> Logout
                    </button>
                    
                    <div className="mt-4 text-center pb-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Software Platform</p>
                        <div className="text-slate-400 font-black tracking-tight flex items-center justify-center gap-1.5">
                            <Smartphone size={14} className="text-indigo-400" /> Smart Table
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Main Content Outlet */}
            <main className="flex-1 flex flex-col h-[calc(100dvh-72px)] md:h-[100dvh] overflow-hidden bg-slate-50 relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}