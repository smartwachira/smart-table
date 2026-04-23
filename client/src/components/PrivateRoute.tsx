import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
    allowedRoles?: UserRole[]
}

//This component acts as a bouncer
const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) =>{
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if(isLoading){
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black selection:bg-amber-500/30">
                <div className="flex flex-col items-center gap-4 text-amber-500 animate-in fade-in duration-700">
                    <Loader2 size={32} className="animate-spin"></Loader2>
                    <div className="tracking-[0.2em] uppercase font-light text-sm">
                        Verifying Workspace...
                    </div>
                </div>
            </div>
        );
    }

    if (!user){
        return <Navigate to="/login" state={{ from: location}} replace />;

    }

    // 3. Authenticated but Unauthorized Role -> Eject to appropriate domain
    if(allowedRoles && !allowedRoles.includes(user.role) ){
        if (['OWNER','MANAGER'].includes(user.role)){
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/kitchen" replace />;
    }

    return <Outlet/>
};

export default PrivateRoute;