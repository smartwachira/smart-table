import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FloatingCart from '../components/guest/FloatingCart';

const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface-muted flex flex-col">
            <Navbar />
            <FloatingCart />
            {/* Accessibility Note: <main> is essential for screen readers.
                flex-grow: Pushes the footer (if we add one) to the bottom.
                pt-6: Adds breathing room below the fixed header.
            */}
            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-20">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;