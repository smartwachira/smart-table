import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    LayoutDashboard, 
    MenuSquare, 
    Users, 
    QrCode, 
    Settings, 
    LogOut,
    History,
    Store,
    Smartphone,
    Menu, 
    MonitorSmartphone,  
    ClipboardList,
    X,
    ChefHat // ⚡ Imported ChefHat for the Live Orders tab
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    const [venue, setVenue] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

    useEffect(() => {
        const fetchVenueForSidebar = async () => {
            try {
                const res = await axios.get('/api/settings/venue');
                setVenue(res.data);
            } catch (error) {
                console.error("Failed to fetch venue data for sidebar:", error);
            }
        };
        fetchVenueForSidebar();
    }, []);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { path: '/dashboard/pos', icon: MonitorSmartphone, label: 'POS Terminal'},
        { path: '/dashboard/my-orders', icon: ClipboardList ,label: 'My Orders'},
        { path: '/dashboard/orders', icon: ChefHat, label: 'Live Orders' }, 
        { path: '/dashboard/history', icon: History, label: 'Order History' }, 
        { path: '/dashboard/menu', icon: MenuSquare, label: 'Menu Engineering' },
        { path: '/dashboard/staff', icon: Users, label: 'Staff' },
        { path: '/dashboard/qr', icon: QrCode, label: 'QR Codes' },
        { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out shadow-xl lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                <div className="p-6 pb-4 border-b border-slate-800 mb-6 bg-slate-950/30 flex justify-between items-start">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700 shadow-inner">
                            {venue?.logo_url ? (
                                <img 
                                    src={`http://localhost:5000${venue.logo_url}`} 
                                    alt="Venue Logo" 
                                    className="w-full h-full object-cover animate-in fade-in duration-500" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                                />
                            ) : (
                                <Store size={24} className="text-indigo-400" />
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="font-black text-white leading-tight tracking-tight truncate text-lg">
                                {venue?.name || 'Your Venue'}
                            </h2>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mt-0.5">Admin Panel</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsSidebarOpen(false)} 
                        className="lg:hidden text-slate-400 hover:text-white p-1 -mr-2 bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/dashboard');
                        
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${
                                    isActive 
                                    ? 'bg-indigo-500/15 text-indigo-400' 
                                    : 'hover:bg-slate-800/80 hover:text-white'
                                }`}
                            >
                                <Icon size={20} className={`${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-800 bg-slate-950/20">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 mb-6"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>

                    <div className="text-center pb-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Software Platform</p>
                        <div className="text-slate-400 font-black tracking-tight flex items-center justify-center gap-1.5">
                            <Smartphone size={14} className="text-indigo-400" /> Smart Table
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="font-black text-slate-900 tracking-tight text-lg truncate flex-1">
                        {venue?.name || 'Dashboard'}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}