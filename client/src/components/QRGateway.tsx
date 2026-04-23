import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, UtensilsCrossed, AlertTriangle } from 'lucide-react';

// 🛡️ Strict Interface for the expected Backend Response
interface GuestSessionResponse {
    message: string;
    token: string;
    venueName?: string;
}

const QRGateway: React.FC = () =>{
    const { venueId, tableName } = useParams<{ venueId: string; tableName: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeSession = async () => {
            try {
                if (!venueId || !tableName) {
                    throw new Error("Invalid QR Code parameters.");
                }
                // Extract the mode from the URL query parameter (e.g., ?m=k)
                const mode = searchParams.get('m') || 't'; 

                // Hit the new backend endpoint
                const res = await axios.post<GuestSessionResponse>('/api/auth/guest-session', {
                    venueId,
                    tableName: decodeURIComponent(tableName),
                    mode
                });

                // Save the Guest Token to localStorage
                localStorage.setItem('guest_token', res.data.token);
                
                // Optional: If you want to store the venue name for UI purposes
                if (res.data.venueName) {
                    localStorage.setItem('venueName', res.data.venueName);
                };
                
                navigate('/menu', { replace: true });
                

            } catch (err: any) {
                console.error("Failed to initialize session:", err);
                setError(err.response?.data?.message || "This QR code appears to be invalid or expired.");
            }
        };

        if (venueId && tableName) {
            initializeSession();
        } else {
            setError("Malformed QR code link.");
        }
    }, [venueId, tableName, searchParams, navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Oops!</h1>
                <p className="text-slate-500 font-medium">{error}</p>
                <p className="text-sm text-slate-400 mt-6">Please ask a staff member for assistance.</p>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="animate-bounce mb-8">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl rotate-3 flex items-center justify-center shadow-2xl shadow-indigo-600/50">
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