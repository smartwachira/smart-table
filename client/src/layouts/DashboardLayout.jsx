import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Menu, X, LayoutDashboard, ClipboardList, 
  UtensilsCrossed, QrCode, Users, Settings, LogOut 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSignOut = ()=>{
    logout();
    toast.success('Successfully clocked out. Have a good rest!');
    setTimeout(() => navigate('/login'), 1500);
  }
  

  const navLinks = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Orders', path: '/dashboard/orders', icon: ClipboardList },
    { name: 'Menu', path: '/dashboard/menu', icon: UtensilsCrossed },
    { name: 'QR Codes', path: '/dashboard/qr', icon: QrCode },
    { name: 'Staff', path: '/dashboard/staff', icon: Users },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      <Toaster position="top-right" />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <span className="text-xl font-bold text-white tracking-wide">Smart Table</span>
          </div>
          <button 
            onClick={closeSidebar}
            className="p-2 -mr-2 text-slate-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={closeSidebar}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <link.icon size={22} />
              <span className="font-medium text-lg">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Quick Info (Sidebar Bottom) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold uppercase">
              {storedUser.name.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{storedUser.name || 'Admin'}</p>
              <p className="text-xs text-indigo-400 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden bg-slate-100 rounded-lg"
              aria-label="Open sidebar"
            >
              <Menu size={26} />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
              {/* Dynamic Page Title could go here based on route */}
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-slate-700">{storedUser.name}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mt-0.5">
                {user.role}
              </span>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors font-medium border border-red-100"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Clock Out</span>
            </button>
          </div>
        </header>

        {/* Main Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
          {/* Child routes render here */}
          <Outlet />
        </main>

      </div>
    </div>
  );
}