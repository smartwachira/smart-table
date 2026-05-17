import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { useGuestSessionStore } from '../../store/useGuestSessionStore'; 

// ⚡ IMPORT THE NEW CUSTOM HOOK
import { useInitializeGuestSession } from '../../hooks/useQRGateway';

const QRGateway: React.FC = () => {
    const { venueId, tableName } = useParams<{ venueId: string; tableName: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const { initializeSession } = useGuestSessionStore();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ⚡ TANSTACK QUERY: Abstracted Mutation
    const initializeSessionMutation = useInitializeGuestSession();

    useEffect(() => {
        if (!venueId || !tableName) {
            setErrorMsg("Malformed QR code link.");
            return;
        }

        // 1. Mint the anonymous UUID for order tracking instantly via Zustand
        initializeSession();

        const mode = searchParams.get('m') || 't'; 

        // 2. Trigger the network mutation
        initializeSessionMutation.mutate({ 
            venueId, 
            tableName: decodeURIComponent(tableName), 
            mode 
        }, {
            onSuccess: (data) => {
                // Save the JWT
                localStorage.setItem('guest_token', data.token);
                if (data.venueName) {
                    localStorage.setItem('venueName', data.venueName);
                }
                // Push to Menu
                navigate('/menu', { replace: true });
            },
            onError: (err: any) => {
                console.error("Failed to initialize session:", err);
                setErrorMsg(err.response?.data?.message || "This QR code appears to be invalid or expired.");
            }
        });

        // We only want this to run once on mount when the URL params are parsed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    if (errorMsg) {
        return (
            <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Oops!</h1>
                <p className="text-slate-600 font-medium">{errorMsg}</p>
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