import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import api from '../../utils/axiosConfig'; // ⚡ Use the Interceptor
import { useGuestSessionStore } from '../../store/useGuestSessionStore'; // ⚡ Import Session Store

// 🛡️ Strict Interface
interface GuestSessionResponse {
    message: string;
    token: string;
    venueName?: string;
}

const QRGateway: React.FC = () => {
    const { venueId, tableName } = useParams<{ venueId: string; tableName: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const { initializeSession } = useGuestSessionStore(); // ⚡ Hook into Zustand
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupConnection = async () => {
            try {
                if (!venueId || !tableName) {
                    throw new Error("Invalid QR Code parameters.");
                }

                // ⚡ 1. Mint the anonymous UUID for order tracking instantly
                initializeSession();

                const mode = searchParams.get('m') || 't'; 

                // ⚡ 2. Hit the backend using the configured API client
                const res = await api.post<GuestSessionResponse>('/api/auth/guest-session', {
                    venueId,
                    tableName: decodeURIComponent(tableName),
                    mode
                });

                // 3. Save the JWT
                localStorage.setItem('guest_token', res.data.token);
                
                if (res.data.venueName) {
                    localStorage.setItem('venueName', res.data.venueName);
                };
                
                // 4. Push to Menu
                navigate('/menu', { replace: true });

            } catch (err: any) {
                console.error("Failed to initialize session:", err);
                setError(err.response?.data?.message || "This QR code appears to be invalid or expired.");
            }
        };

        if (venueId && tableName) {
            setupConnection();
        } else {
            setError("Malformed QR code link.");
        }
    }, [venueId, tableName, searchParams, navigate, initializeSession]);

    if (error) {
        return (
            <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Oops!</h1>
                <p className="text-slate-600 font-medium">{error}</p>
                <p className="text-sm text-slate-400 mt-6 font-semibold">Please ask a staff member for assistance.</p>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="animate-bounce mb-8">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl rotate-3 flex items-center justify-center shadow-2xl shadow-indigo-600/50 border-4 border-slate-800">
                    <UtensilsCrossed size={40} className="text-white -rotate-3" />
                </div>
            </div>
            
            <Loader2 size={32} className="text-indigo-400 animate-spin mb-4" />
            
            <h1 className="text-2xl font-black text-white tracking-tight">Setting your table...</h1>
            <p className="text-indigo-200 font-medium mt-2">Preparing your digital menu.</p>
        </div>
    );
};

export default QRGateway;