import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

//This component acts as a bouncer
export default function PrivateRoute({ allowedRoles }){
    const { user, isLoading } = useAuth();

    if(isLoading){
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-amber-500 tracking-[0.2em] uppercase font-light text-sm animate-pulse">
                    Authenticating Workspace...
                </div>
            </div>
        );
    }

    if (!user){
        return <Navigate to="/login" replace />;

    }

    if(allowedRoles && !allowedRoles.includes(user.role) ){
        if (['OWNER','MANAGER'].includes(user.role)){
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/kitchen" replace />;
    }

    return <Outlet/>
};

